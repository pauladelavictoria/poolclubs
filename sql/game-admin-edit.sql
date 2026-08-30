-- Correcting and unfiling a result: the club admin's, and nobody else's.
--
-- Apply with `npm run db:sql sql/game-admin-edit.sql`, then `npm run db:dump`.
-- See sql/README.md.
--
-- ---------------------------------------------------------------------------
-- What was there before
-- ---------------------------------------------------------------------------
-- `games` had INSERT and SELECT policies for members, a DELETE policy for
-- members, and no UPDATE policy at all — so a mistyped score could be deleted
-- by whoever was standing nearest, but corrected by nobody. Both halves were
-- wrong in the same direction: a filed result is the club's record, and the
-- ranking is computed straight off it, so changing one is an admin's job.
--
-- The UI now offers both (src/pages/app/AddGamePage.tsx, reached from the tape
-- at /app/$clubSlug/games), and hides them from members. This file is what
-- makes that a rule rather than a hidden button.
--
-- club_id stays out of the WITH CHECK's reach in practice: the app never sends
-- it on an update. Checking is_club_admin on both sides is what stops a row
-- being moved into, or out of, a club you do not own.

BEGIN;

-- Deleting a result was any member's. Same reasoning as above, and the same
-- reason `live_matches` lets a member clear only a match already abandoned for
-- three hours: destroying club history is not a thing to do by accident.
DROP POLICY IF EXISTS "Members can delete club games" ON public.games;

DROP POLICY IF EXISTS "Club admins can delete club games" ON public.games;
CREATE POLICY "Club admins can delete club games"
  ON public.games FOR DELETE TO authenticated
  USING (public.is_club_admin(club_id));

DROP POLICY IF EXISTS "Club admins can edit club games" ON public.games;
CREATE POLICY "Club admins can edit club games"
  ON public.games FOR UPDATE TO authenticated
  USING (public.is_club_admin(club_id))
  WITH CHECK (public.is_club_admin(club_id));

COMMIT;
