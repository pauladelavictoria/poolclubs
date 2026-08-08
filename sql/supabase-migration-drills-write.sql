-- Write access to `drills`, for the in-app drill editor (/drills/new, /drills/:id/edit).
-- supabase-migration-drills.sql only grants SELECT, so saves from the app fail
-- silently on RLS without these.
--
-- Rule: anyone signed in may add a drill; only its creator or the admin (the auth
-- user linked to players.id = 1) may change or delete it. Seeded drills have
-- created_by NULL, so they are admin-only. The UI mirror is canEditDrill() in
-- src/libs/drillPermissions.ts — change both together.
--
-- WARNING: sql/drills-seed-bu.sql starts with `DELETE FROM drills`. Re-running the
-- seeds wipes anything authored in the app. Export first, or drop that DELETE.

-- Owner column. The DEFAULT is what actually stamps it — the client never sends
-- created_by, so it cannot forge one, and the INSERT policy rejects it if it tries.
ALTER TABLE drills
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Idempotent: safe to re-run over any earlier version of this file.
DROP POLICY IF EXISTS "Authenticated users can insert drills" ON drills;
DROP POLICY IF EXISTS "Authenticated users can update drills" ON drills;
DROP POLICY IF EXISTS "Authenticated users can delete drills" ON drills;
DROP POLICY IF EXISTS "Admin can insert drills" ON drills;
DROP POLICY IF EXISTS "Admin can update drills" ON drills;
DROP POLICY IF EXISTS "Admin can delete drills" ON drills;
DROP POLICY IF EXISTS "Creator or admin can update drills" ON drills;
DROP POLICY IF EXISTS "Creator or admin can delete drills" ON drills;

-- SECURITY DEFINER so the lookup does not depend on the caller's RLS view of
-- `players`, and STABLE so Postgres calls it once per statement, not per row.
CREATE OR REPLACE FUNCTION is_drill_admin() RETURNS boolean
  LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM players WHERE id = 1 AND user_id = auth.uid());
$$;

CREATE POLICY "Authenticated users can insert drills" ON drills
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- WITH CHECK repeats USING so an update cannot hand the drill to someone else.
CREATE POLICY "Creator or admin can update drills" ON drills
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR is_drill_admin())
  WITH CHECK (created_by = auth.uid() OR is_drill_admin());

CREATE POLICY "Creator or admin can delete drills" ON drills
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR is_drill_admin());
