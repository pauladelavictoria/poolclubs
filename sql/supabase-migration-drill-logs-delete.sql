-- Delete access to `drill_logs`, for the "Últimos resultados" list on
-- /players/:playerId/progress. supabase-migration-drills.sql only grants SELECT
-- and INSERT, so a delete from the app is silently swallowed by RLS: no error,
-- zero rows removed, and the row reappears on the next refetch.

-- A plan step points at the log that completed it. Without this the FK is
-- NO ACTION, so deleting a logged result fails outright once it is part of a
-- training plan. The step keeps its 'completed' status and loses the reference.
ALTER TABLE training_plan_steps
  DROP CONSTRAINT training_plan_steps_drill_log_id_fkey,
  ADD CONSTRAINT training_plan_steps_drill_log_id_fkey
    FOREIGN KEY (drill_log_id) REFERENCES drill_logs(id) ON DELETE SET NULL;

-- Matches the drills policies: any signed-in user, no per-row ownership. The
-- app has no notion of "my" logs yet, and players are not all auth users.
CREATE POLICY "Authenticated users can delete drill logs" ON drill_logs
  FOR DELETE TO authenticated USING (true);
