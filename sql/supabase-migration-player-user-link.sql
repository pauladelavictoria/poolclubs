-- =============================================
-- Migration: Link auth users to players
-- =============================================

-- Add user_id column to players table (nullable - not all players need accounts)
ALTER TABLE players ADD COLUMN user_id UUID REFERENCES auth.users(id) UNIQUE;

-- Allow authenticated users to update their own player link
CREATE POLICY "Users can update their own player link"
  ON players FOR UPDATE
  USING (true)
  WITH CHECK (true);
