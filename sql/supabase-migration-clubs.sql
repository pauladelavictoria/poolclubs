-- =============================================
-- Migration: one club -> many clubs
-- =============================================
--
-- Turns the single implicit club into a tenant. `players` IS the membership row:
-- one row per (club, user), so games, drill_logs and training_plans inherit club
-- scoping for free through player_id. No separate club_members table.
--
-- `games` gets its own club_id anyway, because useGetGames filters by player NAME
-- (src/hooks/useGetGames.tsx) and a name is only unique inside a club.
--
-- Visibility is MEMBERS ONLY: this file revokes the public SELECT that players and
-- games had. Every page in the app moves behind auth as a consequence.
--
-- Run once, top to bottom. Idempotent except for the backfill, which is guarded.
-- Apply BEFORE sql/supabase-migration-social.sql.

-- ---------------------------------------------------------------------------
-- 1. clubs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS clubs (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  -- The invite. 12 hex chars is 48 bits of entropy: not guessable, still
  -- short enough to read down a phone line. Rotate by UPDATEing it.
  join_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Membership columns
-- ---------------------------------------------------------------------------

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
  -- 'pending' until the club owner approves. Everyone can invite, only the
  -- owner lets people in.
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active'));

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 3. Backfill: everything that exists today is club 1, PoolValencia
-- ---------------------------------------------------------------------------
-- Owner is whoever is linked to player 1 (the old ADMIN_PLAYER_ID). If player 1
-- has no user_id yet this INSERT is a no-op and the NOT NULLs below will fail —
-- link it first, or replace the SELECT with a literal uuid.

INSERT INTO clubs (id, name, owner_id)
  SELECT 1, 'PoolValencia', user_id FROM players WHERE id = 1 AND user_id IS NOT NULL
  ON CONFLICT (id) DO NOTHING;

-- SERIAL does not know about the explicit id above; without this the next club
-- created from the app collides on id 1.
SELECT setval(pg_get_serial_sequence('clubs', 'id'), GREATEST((SELECT max(id) FROM clubs), 1));

UPDATE players SET club_id = 1, status = 'active' WHERE club_id IS NULL;
UPDATE games   SET club_id = 1 WHERE club_id IS NULL;

ALTER TABLE players ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE games   ALTER COLUMN club_id SET NOT NULL;

-- One player row per (club, user). NULL user_id repeats freely, which is what
-- keeps guest players (no account) working.
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_user_id_key;
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_club_user_key;
ALTER TABLE players ADD CONSTRAINT players_club_user_key UNIQUE (club_id, user_id);

CREATE INDEX IF NOT EXISTS players_club_idx ON players (club_id, status);
CREATE INDEX IF NOT EXISTS games_club_idx   ON games (club_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Membership helpers
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER is not optional here: a policy ON players that queries
-- players recurses. DEFINER runs the lookup outside RLS and breaks the cycle.
-- STABLE so Postgres calls them once per statement, not once per row.
-- Same pattern as is_drill_admin() in supabase-migration-drills-write.sql.

CREATE OR REPLACE FUNCTION is_club_member(cid INTEGER) RETURNS boolean
  LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM players
    WHERE club_id = cid AND user_id = auth.uid() AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION is_club_admin(cid INTEGER) RETURNS boolean
  LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM clubs WHERE id = cid AND owner_id = auth.uid());
$$;

-- "is this player row me?" — for tables that reference a player as an author.
CREATE OR REPLACE FUNCTION is_own_player(pid INTEGER) RETURNS boolean
  LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM players WHERE id = pid AND user_id = auth.uid());
$$;

-- "may I write rows that hang off this player?" — drill logs, training plans.
-- Any active member of that player's club may, which is how it worked before.
CREATE OR REPLACE FUNCTION can_touch_player(pid INTEGER) RETURNS boolean
  LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM players p WHERE p.id = pid AND is_club_member(p.club_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- 5. Policies
-- ---------------------------------------------------------------------------
-- Policy names from earlier migrations are dropped by name. If the live database
-- carries policies created in the dashboard under other names, drop those too —
-- multiple permissive policies OR together, so one leftover public-SELECT policy
-- undoes this entire file. Check with:
--   SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public';

-- clubs -------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view their clubs" ON clubs;
DROP POLICY IF EXISTS "Authenticated users can create clubs" ON clubs;
DROP POLICY IF EXISTS "Owner can update club" ON clubs;
DROP POLICY IF EXISTS "Owner can delete club" ON clubs;

-- is_club_admin as well as is_club_member: the owner must still see the club in
-- the instant between creating it and their own membership row existing.
CREATE POLICY "Members can view their clubs" ON clubs
  FOR SELECT TO authenticated USING (is_club_member(id) OR is_club_admin(id));

CREATE POLICY "Authenticated users can create clubs" ON clubs
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner can update club" ON clubs
  FOR UPDATE TO authenticated USING (is_club_admin(id)) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner can delete club" ON clubs
  FOR DELETE TO authenticated USING (is_club_admin(id));

-- players -----------------------------------------------------------------
DROP POLICY IF EXISTS "Enable read access for all users" ON players;
DROP POLICY IF EXISTS "Public players are viewable by everyone" ON players;
DROP POLICY IF EXISTS "Users can update their own player link" ON players;
DROP POLICY IF EXISTS "Signed-in users can update players" ON players;
DROP POLICY IF EXISTS "Members can view club players" ON players;
DROP POLICY IF EXISTS "Admin can add players" ON players;
DROP POLICY IF EXISTS "Members can update club players" ON players;
DROP POLICY IF EXISTS "Admin can remove players" ON players;

-- `OR user_id = auth.uid()` so a pending member can see their own row and be
-- told they are waiting, rather than seeing nothing at all.
CREATE POLICY "Members can view club players" ON players
  FOR SELECT TO authenticated USING (is_club_member(club_id) OR user_id = auth.uid());

-- Joining goes through join_club(); this is the admin adding a guest player.
CREATE POLICY "Admin can add players" ON players
  FOR INSERT TO authenticated WITH CHECK (is_club_admin(club_id));

-- Names and categories stay editable by any member, as before. club_id, status
-- and user_id are locked down by the trigger below, not by this policy.
CREATE POLICY "Members can update club players" ON players
  FOR UPDATE TO authenticated
  USING (is_club_member(club_id)) WITH CHECK (is_club_member(club_id));

CREATE POLICY "Admin can remove players" ON players
  FOR DELETE TO authenticated USING (is_club_admin(club_id));

-- games -------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable read access for all users" ON games;
DROP POLICY IF EXISTS "Users can view own games" ON games;
DROP POLICY IF EXISTS "Users can insert own games" ON games;
DROP POLICY IF EXISTS "Users can update own games" ON games;
DROP POLICY IF EXISTS "Users can delete own games" ON games;
DROP POLICY IF EXISTS "Members can view club games" ON games;
DROP POLICY IF EXISTS "Members can add club games" ON games;
DROP POLICY IF EXISTS "Members can delete club games" ON games;

CREATE POLICY "Members can view club games" ON games
  FOR SELECT TO authenticated USING (is_club_member(club_id));

CREATE POLICY "Members can add club games" ON games
  FOR INSERT TO authenticated WITH CHECK (is_club_member(club_id));

CREATE POLICY "Members can delete club games" ON games
  FOR DELETE TO authenticated USING (is_club_member(club_id));

-- drill_logs / training plans ---------------------------------------------
-- These were WITH CHECK (true) with no TO clause, i.e. anon could write them.
-- Now they follow the player they hang off.
DROP POLICY IF EXISTS "Anyone can view drill logs" ON drill_logs;
DROP POLICY IF EXISTS "Anyone can insert drill logs" ON drill_logs;
DROP POLICY IF EXISTS "Authenticated users can delete drill logs" ON drill_logs;
DROP POLICY IF EXISTS "Members can read drill logs" ON drill_logs;
DROP POLICY IF EXISTS "Members can write drill logs" ON drill_logs;
DROP POLICY IF EXISTS "Members can delete drill logs" ON drill_logs;

CREATE POLICY "Members can read drill logs" ON drill_logs
  FOR SELECT TO authenticated USING (can_touch_player(player_id));
CREATE POLICY "Members can write drill logs" ON drill_logs
  FOR INSERT TO authenticated WITH CHECK (can_touch_player(player_id));
CREATE POLICY "Members can delete drill logs" ON drill_logs
  FOR DELETE TO authenticated USING (can_touch_player(player_id));

DROP POLICY IF EXISTS "Anyone can view training plans" ON training_plans;
DROP POLICY IF EXISTS "Anyone can insert training plans" ON training_plans;
DROP POLICY IF EXISTS "Anyone can update training plans" ON training_plans;
DROP POLICY IF EXISTS "Members can read training plans" ON training_plans;
DROP POLICY IF EXISTS "Members can write training plans" ON training_plans;
DROP POLICY IF EXISTS "Members can update training plans" ON training_plans;

CREATE POLICY "Members can read training plans" ON training_plans
  FOR SELECT TO authenticated USING (can_touch_player(player_id));
CREATE POLICY "Members can write training plans" ON training_plans
  FOR INSERT TO authenticated WITH CHECK (can_touch_player(player_id));
CREATE POLICY "Members can update training plans" ON training_plans
  FOR UPDATE TO authenticated
  USING (can_touch_player(player_id)) WITH CHECK (can_touch_player(player_id));

DROP POLICY IF EXISTS "Anyone can view training plan steps" ON training_plan_steps;
DROP POLICY IF EXISTS "Anyone can insert training plan steps" ON training_plan_steps;
DROP POLICY IF EXISTS "Anyone can update training plan steps" ON training_plan_steps;
DROP POLICY IF EXISTS "Members can read plan steps" ON training_plan_steps;
DROP POLICY IF EXISTS "Members can write plan steps" ON training_plan_steps;
DROP POLICY IF EXISTS "Members can update plan steps" ON training_plan_steps;

-- Steps reach their club through plan -> player.
CREATE OR REPLACE FUNCTION can_touch_plan(pid INTEGER) RETURNS boolean
  LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM training_plans tp
    WHERE tp.id = pid AND can_touch_player(tp.player_id)
  );
$$;

CREATE POLICY "Members can read plan steps" ON training_plan_steps
  FOR SELECT TO authenticated USING (can_touch_plan(plan_id));
CREATE POLICY "Members can write plan steps" ON training_plan_steps
  FOR INSERT TO authenticated WITH CHECK (can_touch_plan(plan_id));
CREATE POLICY "Members can update plan steps" ON training_plan_steps
  FOR UPDATE TO authenticated
  USING (can_touch_plan(plan_id)) WITH CHECK (can_touch_plan(plan_id));

-- `drills` is deliberately untouched: one global library shared by every club,
-- still admin-authored via is_drill_admin(). Drill *results* are club-private,
-- the drills themselves are not.

-- ---------------------------------------------------------------------------
-- 6. Column guard
-- ---------------------------------------------------------------------------
-- The members-can-update policy above is row-level, so it cannot stop a member
-- rewriting their own status to 'active' or moving a player to another club.
-- RLS has no column granularity that can depend on the row; a BEFORE UPDATE
-- trigger is the one place that can compare OLD to NEW. Extends the
-- user_id guard from supabase-migration-players-policy-split.sql.

CREATE OR REPLACE FUNCTION players_guard_user_id() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- No auth.uid() means service_role or the SQL editor: your own maintenance,
  -- including unlinking a player, still works.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    IF OLD.user_id IS NOT NULL OR NEW.user_id <> auth.uid() THEN
      RAISE EXCEPTION
        'players.user_id may only be set to your own id, and only on an unlinked player';
    END IF;
  END IF;

  IF NEW.club_id IS DISTINCT FROM OLD.club_id AND NOT is_club_admin(OLD.club_id) THEN
    RAISE EXCEPTION 'only the club owner may move a player between clubs';
  END IF;

  -- The one status change that is not the owner's: claiming an unclaimed player
  -- drops it to 'pending', so holding the join code is not the same as being
  -- that person. join_club() relies on this.
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT is_club_admin(OLD.club_id)
     AND NOT (OLD.user_id IS NULL AND NEW.user_id = auth.uid() AND NEW.status = 'pending') THEN
    RAISE EXCEPTION 'only the club owner may change a member''s status';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS players_guard_user_id ON players;
CREATE TRIGGER players_guard_user_id BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION players_guard_user_id();

-- ---------------------------------------------------------------------------
-- 7. RPCs — the only way to touch a club you are not in yet
-- ---------------------------------------------------------------------------

-- Create a club and put yourself in it, in one transaction. Two client calls
-- would leave an ownerless-looking club behind if the second one failed.
CREATE OR REPLACE FUNCTION create_club(club_name TEXT) RETURNS INTEGER
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cid INTEGER;
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'sign in first'; END IF;

  INSERT INTO clubs (name, owner_id) VALUES (btrim(club_name), uid) RETURNING id INTO cid;

  INSERT INTO players (club_id, user_id, name, category, status)
  VALUES (
    cid, uid,
    COALESCE(NULLIF(btrim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''), 'Player'),
    3, 'active'
  );

  RETURN cid;
END $$;

-- What the join link shows before you commit to anything: the club's name, and
-- the players nobody has claimed yet, so a regular who predates accounts can
-- recognise themselves instead of creating a duplicate.
CREATE OR REPLACE FUNCTION club_preview(code TEXT)
  RETURNS TABLE (club_id INTEGER, club_name TEXT, player_id INTEGER, player_name TEXT)
  LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT c.id, c.name, p.id, p.name
  FROM clubs c
  LEFT JOIN players p ON p.club_id = c.id AND p.user_id IS NULL
  WHERE c.join_code = lower(btrim(code))
  ORDER BY p.name;
$$;

-- Join by code. Either claim an unclaimed player row or get a fresh one; both
-- land as 'pending' for the owner to approve. Re-joining is a no-op, not an error.
CREATE OR REPLACE FUNCTION join_club(code TEXT, claim_player_id INTEGER DEFAULT NULL)
  RETURNS INTEGER
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cid INTEGER;
  uid UUID := auth.uid();
  claimed INTEGER;
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

  INSERT INTO players (club_id, user_id, name, category, status)
  VALUES (
    cid, uid,
    COALESCE(NULLIF(btrim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''), 'Player'),
    3, 'pending'
  );

  RETURN cid;
END $$;

REVOKE ALL ON FUNCTION create_club(TEXT) FROM anon;
REVOKE ALL ON FUNCTION join_club(TEXT, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION create_club(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION club_preview(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION join_club(TEXT, INTEGER) TO authenticated;

-- Sanity checks after applying:
--   SELECT count(*) FROM players WHERE club_id IS NULL;  -- must be 0
--   SELECT count(*) FROM games   WHERE club_id IS NULL;  -- must be 0
--   SELECT * FROM clubs;                                  -- one row, owner set
--   SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'
--     ORDER BY tablename;                                 -- no leftover public reads
