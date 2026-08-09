-- Player pictures, for the home feed. A photo lives on the player row rather
-- than being read from auth: `auth.users` metadata is only visible to its own
-- owner, so every other member would see an initial instead of a face.
--
-- The value is filled from the OAuth avatar on sign-in (src/context/AuthContext.tsx).
-- Guest players (user_id IS NULL) simply stay NULL and keep their initial.
--
-- No new policy: "Members can update club players" from
-- sql/supabase-migration-clubs.sql already covers this column, same as `name`.

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
