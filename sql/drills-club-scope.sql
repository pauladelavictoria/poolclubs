-- Scope player-created drills to the club they were created in, while the
-- seeded catalog (BU/PPC/Dr Dave, created_by is null) stays global.

alter table public.drills
  add column club_id integer references public.clubs(id);

drop policy "Drills are viewable by everyone" on public.drills;
create policy "Members can view club drills or the shared catalog" on public.drills
  for select to authenticated
  using (club_id is null or public.is_club_member(club_id));

drop policy "Authenticated users can insert drills" on public.drills;
create policy "Members can insert their own club drills" on public.drills
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and club_id is not null
    and public.is_club_member(club_id)
  );

drop policy "Creator or admin can update drills" on public.drills;
create policy "Creator or admin can update drills" on public.drills
  for update to authenticated
  using (created_by = auth.uid() or public.is_drill_admin())
  with check (
    (created_by = auth.uid() and (club_id is null or public.is_club_member(club_id)))
    or public.is_drill_admin()
  );
