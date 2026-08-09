-- Reactions were a fixed list of five emoji, so every new one meant a migration.
-- Only needed if sql/supabase-migration-social.sql was already run — that file
-- now creates the column this way.
--
-- The bound stays because the value is rendered raw in every member's feed and
-- PostgREST can be posted to directly: without it, a paragraph can be stored as
-- a reaction and only its author or a club admin can remove it.

ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_emoji_check;
ALTER TABLE reactions ADD CONSTRAINT reactions_emoji_check
  CHECK (char_length(emoji) BETWEEN 1 AND 16);
