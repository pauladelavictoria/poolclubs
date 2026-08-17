-- Let a drill's creator (or a drill admin) delete it. Mirrors the existing
-- "Creator or admin can update drills" policy in drills-club-scope.sql.

create policy "Creator or admin can delete drills" on public.drills
  for delete to authenticated
  using (created_by = auth.uid() or public.is_drill_admin());
