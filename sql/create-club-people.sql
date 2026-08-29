-- create_club(), finally moved onto people.
--
-- people.sql took user_id off players and put it on people, and rewrote
-- join_club() to match. create_club() was missed. It has been inserting
--
--   INSERT INTO players (club_id, user_id, name, category, status)
--
-- ever since, against a table that has neither user_id nor name, so every
-- attempt has failed with 42703 "column user_id of relation players does not
-- exist" and the app has shown "Something went wrong". Nobody noticed because
-- everybody with a club already had one: it only breaks for a brand-new
-- account, which is exactly what a working sign-up flow now produces.
--
-- The body below is join_club()'s person handling, minus the claiming: find the
-- caller's person, make one if this is their first club, then attach a player
-- row to it. Status is 'active', not 'pending' — the person creating the club
-- is its admin and has nobody to approve them.
--
-- Apply:  npm run db:sql sql/create-club-people.sql
-- Then:   npm run db:dump && npm run db:types

CREATE OR REPLACE FUNCTION public.create_club(club_name text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  cid INTEGER;
  uid UUID := auth.uid();
  me BIGINT;
  pname TEXT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'sign in first'; END IF;

  INSERT INTO clubs (name, owner_id) VALUES (btrim(club_name), uid) RETURNING id INTO cid;

  -- One person per account, shared across every club they belong to. Someone
  -- starting their second club already has one and keeps their name and face.
  SELECT id INTO me FROM people WHERE user_id = uid;

  IF me IS NULL THEN
    pname := COALESCE(
      NULLIF(btrim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
      'Player'
    );
    INSERT INTO people (name, user_id) VALUES (pname, uid) RETURNING id INTO me;
  END IF;

  INSERT INTO players (club_id, person_id, category, status)
  VALUES (cid, me, 3, 'active');

  RETURN cid;
END $$;

ALTER FUNCTION public.create_club(club_name text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.create_club(club_name text) TO authenticated;
GRANT ALL ON FUNCTION public.create_club(club_name text) TO service_role;
