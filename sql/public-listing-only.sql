-- players.is_public means "listed", not "readable".
--
-- Apply with `npm run db:sql sql/public-listing-only.sql`, then `npm run db:dump`.
-- Amends sql/public-pages.sql, which got this wrong.
--
-- That file made a player's whole row invisible to anon when they opted out. It
-- does hide them, and it also breaks everything they ever took part in: games
-- carry player ids, tournament fixtures carry player ids, and a ranking is
-- computed from games. Hide the row and the club's public ranking silently
-- disagrees with its own members', a bracket loses an entrant to "to be
-- decided", and a league table stops adding up. One person's preference should
-- not rewrite the club's record.
--
-- So the setting is about *lists*: opting out keeps you off /players and off the
-- roster on your club's page. Your name still appears in results, standings and
-- draws, because those are the club's history and not your profile. The app
-- enforces the listing part with a filter on the two directory queries — see
-- publicPlayersQuery and publicClubRosterQuery in src/queries/public.ts — and
-- the sitemap leaves unlisted profiles out, so they are reachable by link but
-- never advertised.

DROP POLICY "Public players of public clubs are readable by anyone" ON public.players;

-- No is_public here on purpose: see above. Still only active members, and still
-- only clubs that are themselves public.
CREATE POLICY "Players of public clubs are readable by anyone" ON public.players
    FOR SELECT TO anon
    USING (status = 'active' AND public.is_public_club(club_id));

-- The same mistake, undone on games: a per-participant privacy check here meant
-- a public club's results tape lost every game a hidden player was in. (It never
-- actually worked either — the subquery on players ran under anon's own RLS, so
-- it could not see the hidden rows it was looking for. A policy that silently
-- passes is worse than one that visibly fails.)
DROP POLICY "Games of public clubs are readable by anyone" ON public.games;

CREATE POLICY "Games of public clubs are readable by anyone" ON public.games
    FOR SELECT TO anon
    USING (public.is_public_club(club_id));
