-- Splits the blanket `players` UPDATE policy from supabase-migration-player-user-link.sql.
--
-- That policy was FOR UPDATE USING (true) WITH CHECK (true) with no TO clause, which
-- meant two things: anon could write to `players` at all, and any signed-in user could
-- set players.user_id on row 1 to their own uid — taking over the drill admin that
-- sql/supabase-migration-drills-write.sql grants to whoever is linked to player 1.
--
-- Two concerns, split apart:
--   1. Player details (name, category) — open to any signed-in user, as before.
--   2. players.user_id — you may claim an UNLINKED player for YOURSELF, nothing else.
--
-- (2) is a column rule, and RLS is row-level: multiple permissive policies OR together,
-- so a second "only if user_id IS NULL" policy would just be widened by the first.
-- Column-level GRANTs are role-wide, so they cannot condition on the row either. A
-- BEFORE UPDATE trigger is the one place that can compare OLD.user_id to NEW.user_id.

-- 1. Row policy: details are editable by signed-in users, and only signed-in users.
DROP POLICY IF EXISTS "Users can update their own player link" ON players;
DROP POLICY IF EXISTS "Signed-in users can update players" ON players;

CREATE POLICY "Signed-in users can update players" ON players
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 2. Column rule: user_id is claim-once, self-only.
CREATE OR REPLACE FUNCTION players_guard_user_id() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    -- No auth.uid() means service_role or the SQL editor: your own maintenance,
    -- including unlinking a player, still works.
    IF auth.uid() IS NOT NULL
       AND (OLD.user_id IS NOT NULL OR NEW.user_id <> auth.uid()) THEN
      RAISE EXCEPTION
        'players.user_id may only be set to your own id, and only on an unlinked player';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS players_guard_user_id ON players;
CREATE TRIGGER players_guard_user_id BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION players_guard_user_id();

-- Sanity check after applying: this must return one row, you.
-- SELECT id, name, user_id FROM players WHERE id = 1;
-- An unlinked player 1 is still claimable by the first user who asks for it, which
-- would hand them drill admin. Link it before anyone else can.
