-- =============================================
-- players.is_caretaker
-- =============================================
--
-- Owning a club is not the same as being in one. The app resolves a club from
-- your memberships — src/routes/app/_authed/$clubSlug/route.tsx: "a club you
-- are not in reads the same as a club that does not exist" — so the account
-- that owns the seeded directory clubs cannot open a single one of them, and
-- the club switcher shows none of them either.
--
-- A players row fixes the access. Flagging it fixes the arithmetic: without
-- this column, 127 empty directory entries would each report one member, and
-- member_count is what the directory sorts on.
--
-- This mirrors is_device, the other players row that is not a person — a
-- tablet is a member so RLS lets it score, and is filtered out of the roster
-- (src/queries/players.ts). Kept as a separate flag rather than reusing that
-- one, because is_device also gates can_score_live_match and switches the whole
-- layout to kiosk mode.
--
-- Apply with `npm run db:sql sql/players-caretaker.sql`, then `npm run db:dump`
-- and `npm run db:types`, then delete this file — see sql/README.md.
-- =============================================

BEGIN;

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS is_caretaker boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN public.players.is_caretaker IS
  'Holds the keys, does not play here: kept out of member_count and out of the roster.';

CREATE OR REPLACE FUNCTION "public"."clubs_recount_members"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    ids integer[] := '{}';
    cid integer;
BEGIN
    -- Both sides, because an UPDATE can move a player between clubs. The TG_OP
    -- checks are statements rather than a CASE inside one expression: plpgsql
    -- raises on any reference to OLD during an INSERT, so the guard has to stop
    -- the reference being evaluated at all.
    IF TG_OP <> 'INSERT' THEN
        ids := ids || OLD.club_id;
    END IF;
    IF TG_OP <> 'DELETE' THEN
        ids := ids || NEW.club_id;
    END IF;

    FOR cid IN
        SELECT DISTINCT c FROM unnest(ids) AS c WHERE c IS NOT NULL
    LOOP
        UPDATE public.clubs
        SET member_count = (
            SELECT count(*) FROM public.players
            WHERE club_id = cid AND status = 'active'
              -- A caretaker holds the keys; they do not play here.
              AND NOT is_caretaker
        )
        WHERE id = cid;
    END LOOP;

    RETURN NULL;
END;
$$;

-- Every count in the table predates the column. One pass to put them right;
-- the trigger keeps them right from here.
UPDATE public.clubs c
SET member_count = (
  SELECT count(*) FROM public.players p
  WHERE p.club_id = c.id AND p.status = 'active' AND NOT p.is_caretaker
)
WHERE c.member_count IS DISTINCT FROM (
  SELECT count(*) FROM public.players p
  WHERE p.club_id = c.id AND p.status = 'active' AND NOT p.is_caretaker
);

COMMIT;
