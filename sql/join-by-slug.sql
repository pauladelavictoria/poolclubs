-- The invite link now addresses a club by its slug instead of a rotatable
-- join_code, so a printed QR/poster never goes stale when the code changes —
-- because there is no longer a code to change.
--
-- Apply with `npm run db:sql sql/join-by-slug.sql`, then `npm run db:dump` and
-- `npm run db:types`. See sql/README.md.
--
-- clubs.slug is already public: public-pages.sql grants it to anon and it
-- already addresses /clubs/$slug. Keying the join flow off it exposes nothing
-- that was not already exposed. What it gives up is revocation — a leaked
-- join_code could be rotated to kill old links, a leaked slug cannot, since it
-- is also the club's permanent address — a tradeoff accepted deliberately here
-- (see the app-side removal of the "change code" button).

-- Signature identity in Postgres is by argument types, not names, but the
-- functions below also rename the parameter (code -> slug), which
-- CREATE OR REPLACE refuses for an existing IN parameter. Drop first.
DROP FUNCTION IF EXISTS public.club_preview(code text);
DROP FUNCTION IF EXISTS public.join_club(code text, claim_player_id integer, display_name text);

-- p_ prefix, not "slug": the bare name collides with clubs.slug in scope and
-- Postgres refuses to guess which one an unqualified reference means.
CREATE FUNCTION public.club_preview(p_slug text) RETURNS TABLE(club_id integer, club_name text, player_id integer, player_name text, claimable boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT c.id, c.name, p.id, pe.name, pe.user_id IS NULL
  FROM clubs c
  LEFT JOIN players p ON p.club_id = c.id
  LEFT JOIN people pe ON pe.id = p.person_id
  WHERE c.slug = lower(btrim(p_slug))
  ORDER BY pe.name;
$$;

ALTER FUNCTION public.club_preview(p_slug text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.club_preview(p_slug text) TO anon;
GRANT ALL ON FUNCTION public.club_preview(p_slug text) TO authenticated;
GRANT ALL ON FUNCTION public.club_preview(p_slug text) TO service_role;

CREATE FUNCTION public.join_club(p_slug text, claim_player_id integer DEFAULT NULL::integer, display_name text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  cid INTEGER;
  uid UUID := auth.uid();
  me BIGINT;
  claimed BIGINT;
  pname TEXT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'sign in first'; END IF;

  SELECT id INTO cid FROM clubs WHERE clubs.slug = lower(btrim(p_slug));
  IF cid IS NULL THEN RAISE EXCEPTION 'unknown club'; END IF;

  SELECT id INTO me FROM people WHERE user_id = uid;

  -- Already a member of this club, under whichever person is yours.
  IF me IS NOT NULL AND EXISTS (
    SELECT 1 FROM players WHERE club_id = cid AND person_id = me
  ) THEN
    RETURN cid;
  END IF;

  IF claim_player_id IS NOT NULL AND me IS NULL THEN
    UPDATE people pe
    SET user_id = uid
    FROM players p
    WHERE p.id = claim_player_id
      AND p.club_id = cid
      AND pe.id = p.person_id
      AND pe.user_id IS NULL
    RETURNING pe.id INTO claimed;

    IF claimed IS NOT NULL THEN
      UPDATE players SET status = 'pending' WHERE person_id = claimed;
      RETURN cid;
    END IF;
    -- Claimed between the preview and now, or you already had a person: fall
    -- through and join as somebody new.
  END IF;

  IF me IS NULL THEN
    pname := COALESCE(
      NULLIF(btrim(display_name), ''),
      NULLIF(btrim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
      'Player'
    );
    INSERT INTO people (name, user_id) VALUES (pname, uid) RETURNING id INTO me;
  END IF;

  INSERT INTO players (club_id, person_id, category, status)
  VALUES (cid, me, 3, 'pending');

  RETURN cid;
END $$;

ALTER FUNCTION public.join_club(p_slug text, claim_player_id integer, display_name text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.join_club(p_slug text, claim_player_id integer, display_name text) TO authenticated;
GRANT ALL ON FUNCTION public.join_club(p_slug text, claim_player_id integer, display_name text) TO service_role;

-- The code itself: nothing reads or rotates it any more.
ALTER TABLE public.clubs DROP CONSTRAINT IF EXISTS clubs_join_code_key;
ALTER TABLE public.clubs DROP COLUMN IF EXISTS join_code;
