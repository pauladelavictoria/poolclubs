/**
 * What goes stale when something changes — the one place that knows which
 * query roots hang off which write. queryKeys.ts names the keys; this says
 * which ones move together, so a mutation or a realtime listener names the
 * change, not the caches.
 *
 * The client is passed in because there is one per request under SSR — see
 * libs/queryClient.ts.
 */
import type { QueryClient } from "@tanstack/react-query";
import { keys } from "@/libs/queryKeys";

/** A tournament, its entrants or its fixtures changed: the index shows status,
 *  the page shows everything, and the "tournament" root also holds the
 *  pending-match and league-fixture lists. */
export const refreshTournaments = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: keys.tournaments.all });
  queryClient.invalidateQueries({ queryKey: keys.tournament.all });
};

/** A result was filed, corrected or deleted. It is on the tape, in the
 *  rankings and the calendar, may close a challenge, and — through the fixture
 *  it is linked to (tournament_matches_derive_winner in sql/schema.sql) — moves a tournament's table. */
export const refreshResults = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: keys.games.all });
  queryClient.invalidateQueries({ queryKey: keys.game.all });
  queryClient.invalidateQueries({ queryKey: keys.challenges.all });
  refreshTournaments(queryClient);
};

/** A live match started, ended or was abandoned. A fixture on a table is not
 *  one to offer another table, so the league fixture list moves with it. */
export const refreshLive = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: keys.liveMatches.all });
  queryClient.invalidateQueries({ queryKey: keys.liveMatch.all });
  queryClient.invalidateQueries({
    queryKey: keys.tournament.allLeagueFixtures,
  });
};
