-- =============================================
-- Migration: player names unique per club, not globally
-- =============================================
--
-- supabase-migration-clubs.sql assumed "a name is only unique inside a club"
-- but left the pre-clubs UNIQUE (name) in place, so join_club() failed with
-- 23505 players_name_key the moment the same person joined a second club.
--
-- Per-club uniqueness still matters, and not only because useGetGames
-- (src/hooks/useGetGames.tsx) filters on the name: games.player_*_name are
-- FOREIGN KEYS to players(name), which is what players_name_key was backing.
-- So the global key cannot simply go — those four FKs are repointed at the
-- composite (club_id, name) instead, which is the real identity now.
--
-- Apply AFTER sql/supabase-migration-clubs.sql. Idempotent.
--
-- Sanity check first — both must return no rows, or the constraints below will
-- not build:
--   SELECT club_id, lower(btrim(name)), count(*) FROM players
--   GROUP BY 1, 2 HAVING count(*) > 1;
--   SELECT g.id FROM games g WHERE NOT EXISTS (
--     SELECT 1 FROM players p WHERE p.club_id = g.club_id AND p.name = g.player_1_name);

-- ---------------------------------------------------------------------------
-- 1. Keys
-- ---------------------------------------------------------------------------

ALTER TABLE games
  DROP CONSTRAINT IF EXISTS games_player_1_name_fkey,
  DROP CONSTRAINT IF EXISTS games_player_2_name_fkey,
  DROP CONSTRAINT IF EXISTS games_player_1b_name_fkey,
  DROP CONSTRAINT IF EXISTS games_player_2b_name_fkey;

ALTER TABLE players DROP CONSTRAINT IF EXISTS players_name_key;

-- Plain columns, not an expression: an FK can only reference a real unique
-- constraint, so the case-insensitive rule needs the second index below.
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_club_name_key;
ALTER TABLE players ADD CONSTRAINT players_club_name_key UNIQUE (club_id, name);

-- "juan garcia" and "Juan Garcia" are the same person to anyone reading the
-- ranking. This is the one the join page checks against.
CREATE UNIQUE INDEX IF NOT EXISTS players_club_name_ci_key
  ON players (club_id, lower(btrim(name)));

-- ---------------------------------------------------------------------------
-- 2. Games point at (club, name)
-- ---------------------------------------------------------------------------
-- ON UPDATE CASCADE on all four: player_1/player_2 already had it, so a rename
-- rewrote their games; 1b/2b did not, so the same rename left doubles rows
-- pointing at the old name. Same behaviour for all four now.
--
-- games.club_id is NOT NULL (supabase-migration-clubs.sql), so the composite
-- reference is total for singles. The 1b/2b columns are nullable and MATCH
-- SIMPLE is the default: a row with no doubles partner has NULL there and skips
-- the check, which is what we want.
--
-- Footgun the cascade brings: moving a player to another club (owner-only, see
-- the players guard trigger) now drags every game they appear in across with
-- them, opponents included. Nothing in the app does that today.

ALTER TABLE games
  ADD CONSTRAINT games_player_1_name_fkey
    FOREIGN KEY (club_id, player_1_name) REFERENCES players (club_id, name)
    ON UPDATE CASCADE,
  ADD CONSTRAINT games_player_2_name_fkey
    FOREIGN KEY (club_id, player_2_name) REFERENCES players (club_id, name)
    ON UPDATE CASCADE,
  ADD CONSTRAINT games_player_1b_name_fkey
    FOREIGN KEY (club_id, player_1b_name) REFERENCES players (club_id, name)
    ON UPDATE CASCADE,
  ADD CONSTRAINT games_player_2b_name_fkey
    FOREIGN KEY (club_id, player_2b_name) REFERENCES players (club_id, name)
    ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Let the joiner name themselves
-- ---------------------------------------------------------------------------
-- Per-club uniqueness is not cosmetic: games and rankings resolve players by
-- name (src/hooks/useGetGames.tsx), so two same-name rows in one club would
-- merge their history. Two real people sharing a name disambiguate at the door
-- instead ("Juan C. Alonso"), rather than hitting a raw 23505.
--
-- Drop the old two-arg signature: keeping both makes join_club(text, int)
-- ambiguous to PostgREST.

DROP FUNCTION IF EXISTS join_club(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION join_club(
  code TEXT,
  claim_player_id INTEGER DEFAULT NULL,
  display_name TEXT DEFAULT NULL
) RETURNS INTEGER
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cid INTEGER;
  uid UUID := auth.uid();
  claimed INTEGER;
  pname TEXT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'sign in first'; END IF;

  SELECT id INTO cid FROM clubs WHERE join_code = lower(btrim(code));
  IF cid IS NULL THEN RAISE EXCEPTION 'unknown join code'; END IF;

  IF EXISTS (SELECT 1 FROM players WHERE club_id = cid AND user_id = uid) THEN
    RETURN cid;
  END IF;

  IF claim_player_id IS NOT NULL THEN
    UPDATE players SET user_id = uid, status = 'pending'
    WHERE id = claim_player_id AND club_id = cid AND user_id IS NULL
    RETURNING id INTO claimed;
    IF claimed IS NOT NULL THEN RETURN cid; END IF;
    -- Someone claimed it between the preview and now: fall through to a new row.
  END IF;

  pname := COALESCE(
    NULLIF(btrim(display_name), ''),
    NULLIF(btrim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    'Player'
  );

  IF EXISTS (
    SELECT 1 FROM players
    WHERE club_id = cid AND lower(btrim(name)) = lower(pname)
  ) THEN
    RAISE EXCEPTION 'name taken in this club' USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO players (club_id, user_id, name, category, status)
  VALUES (cid, uid, pname, 3, 'pending');

  RETURN cid;
END $$;

REVOKE ALL ON FUNCTION join_club(TEXT, INTEGER, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION join_club(TEXT, INTEGER, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- club_preview: every name, not only the claimable ones
-- ---------------------------------------------------------------------------
-- So the join page can say "that name is taken" while you type instead of after
-- you submit. Whoever holds the join code now sees the whole roster, not just
-- the unclaimed rows — they are one click from being a member anyway.
--
-- Return type changes, so the old signature has to go first.

DROP FUNCTION IF EXISTS club_preview(TEXT);

CREATE OR REPLACE FUNCTION club_preview(code TEXT)
  RETURNS TABLE (
    club_id INTEGER,
    club_name TEXT,
    player_id INTEGER,
    player_name TEXT,
    claimable BOOLEAN
  )
  LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT c.id, c.name, p.id, p.name, p.user_id IS NULL
  FROM clubs c
  LEFT JOIN players p ON p.club_id = c.id
  WHERE c.join_code = lower(btrim(code))
  ORDER BY p.name;
$$;

GRANT EXECUTE ON FUNCTION club_preview(TEXT) TO authenticated;
