-- =============================================
-- Migration: challenges, comments, reactions
-- =============================================
--
-- Apply AFTER sql/supabase-migration-clubs.sql — everything here leans on the
-- is_club_member() / is_club_admin() / is_own_player() helpers it defines.
--
-- games.id is assumed UUID (see sql/sample-db.sql). If the live table says
-- otherwise, change the three game_id columns below to match or the FKs fail.

-- ---------------------------------------------------------------------------
-- 1. Challenges
-- ---------------------------------------------------------------------------
-- A challenge is a note, not a fixture: it carries a message, no date. It ends
-- as 'played' with game_id pointing at the recorded match.

CREATE TABLE IF NOT EXISTS challenges (
  id SERIAL PRIMARY KEY,
  club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  from_player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  to_player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'played')),
  message TEXT CHECK (char_length(message) <= 500),
  -- SET NULL, not CASCADE: deleting a mis-typed result should not erase the
  -- fact that the two of them played.
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (from_player_id <> to_player_id)
);

CREATE INDEX IF NOT EXISTS challenges_club_idx ON challenges (club_id, status);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view club challenges" ON challenges;
DROP POLICY IF EXISTS "Members can send challenges" ON challenges;
DROP POLICY IF EXISTS "Either side can respond" ON challenges;
DROP POLICY IF EXISTS "Challenger can withdraw" ON challenges;

CREATE POLICY "Members can view club challenges" ON challenges
  FOR SELECT TO authenticated USING (is_club_member(club_id));

-- is_own_player pins the sender: you cannot challenge on someone else's behalf.
CREATE POLICY "Members can send challenges" ON challenges
  FOR INSERT TO authenticated
  WITH CHECK (is_club_member(club_id) AND is_own_player(from_player_id));

-- The target accepts or declines; the challenger marks it played after the
-- match. WITH CHECK repeats USING so neither side can reassign the challenge.
CREATE POLICY "Either side can respond" ON challenges
  FOR UPDATE TO authenticated
  USING (is_own_player(to_player_id) OR is_own_player(from_player_id))
  WITH CHECK (is_own_player(to_player_id) OR is_own_player(from_player_id));

CREATE POLICY "Challenger can withdraw" ON challenges
  FOR DELETE TO authenticated
  USING (is_own_player(from_player_id) OR is_club_admin(club_id));

-- ---------------------------------------------------------------------------
-- 2. Comments and reactions
-- ---------------------------------------------------------------------------
-- Two targets, so two nullable FK columns and a check that exactly one is set.
-- A polymorphic target_type/target_id pair would be one column shorter and lose
-- the cascade: delete a game and its comments would linger as orphans.

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  author_player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  drill_log_id INTEGER REFERENCES drill_logs(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (num_nonnulls(game_id, drill_log_id) = 1)
);

CREATE TABLE IF NOT EXISTS reactions (
  id SERIAL PRIMARY KEY,
  club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  author_player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  drill_log_id INTEGER REFERENCES drill_logs(id) ON DELETE CASCADE,
  -- Any emoji, but only an emoji: the column is rendered raw in every member's
  -- feed and PostgREST is reachable without going through the app, so the bound
  -- is what stops a paragraph being stored as a reaction. REACTIONS in
  -- src/types/index.ts is the picker's palette, not the limit.
  emoji TEXT NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 16),
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (num_nonnulls(game_id, drill_log_id) = 1)
);

CREATE INDEX IF NOT EXISTS comments_game_idx  ON comments (game_id, created_at);
CREATE INDEX IF NOT EXISTS comments_log_idx   ON comments (drill_log_id, created_at);
CREATE INDEX IF NOT EXISTS reactions_game_idx ON reactions (game_id);
CREATE INDEX IF NOT EXISTS reactions_log_idx  ON reactions (drill_log_id);

-- One of each emoji per person per target. Two partial indexes rather than
-- UNIQUE NULLS NOT DISTINCT, which would need Postgres 15+; these work anywhere
-- and skip the NULL column outright.
CREATE UNIQUE INDEX IF NOT EXISTS reactions_game_once
  ON reactions (author_player_id, game_id, emoji) WHERE game_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reactions_log_once
  ON reactions (author_player_id, drill_log_id, emoji) WHERE drill_log_id IS NOT NULL;

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read comments" ON comments;
DROP POLICY IF EXISTS "Members can write comments" ON comments;
DROP POLICY IF EXISTS "Author or admin can delete comments" ON comments;

CREATE POLICY "Members can read comments" ON comments
  FOR SELECT TO authenticated USING (is_club_member(club_id));

CREATE POLICY "Members can write comments" ON comments
  FOR INSERT TO authenticated
  WITH CHECK (is_club_member(club_id) AND is_own_player(author_player_id));

-- No UPDATE policy: comments are not editable. Delete and repost.
CREATE POLICY "Author or admin can delete comments" ON comments
  FOR DELETE TO authenticated
  USING (is_own_player(author_player_id) OR is_club_admin(club_id));

DROP POLICY IF EXISTS "Members can read reactions" ON reactions;
DROP POLICY IF EXISTS "Members can write reactions" ON reactions;
DROP POLICY IF EXISTS "Author can remove reactions" ON reactions;

CREATE POLICY "Members can read reactions" ON reactions
  FOR SELECT TO authenticated USING (is_club_member(club_id));

CREATE POLICY "Members can write reactions" ON reactions
  FOR INSERT TO authenticated
  WITH CHECK (is_club_member(club_id) AND is_own_player(author_player_id));

CREATE POLICY "Author can remove reactions" ON reactions
  FOR DELETE TO authenticated
  USING (is_own_player(author_player_id) OR is_club_admin(club_id));

-- ---------------------------------------------------------------------------
-- 3. Realtime
-- ---------------------------------------------------------------------------
-- A conversation that needs a refresh is not a conversation. src/libs/realtime.ts
-- already runs one channel for the app; these just join it.
-- ADD TABLE errors if the table is already published, hence the swallow.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE challenges;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE comments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE reactions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
