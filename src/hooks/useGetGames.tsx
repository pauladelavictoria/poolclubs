import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { gamesQuery } from "@/queries/games";
import type { UseGetGamesFilters } from "@/queries/games";

export type { UseGetGamesFilters };

// The query itself lives in src/queries/games.ts so a route loader can prime the
// same key before this runs.
export const useGetGames = (
  filters?: UseGetGamesFilters,
  /** The wall display, for the same reason useLiveMatches has one: a filed
   *  result moves the daily ranking, and there is nobody standing at a screen
   *  on a wall to refresh it. Nothing else needs this — every other reader of
   *  this list is a page somebody is holding, and gets its update from the
   *  socket or from coming back to the tab. */
  { poll = false }: { poll?: boolean } = {},
) => {
  const { activeClubId } = useAuth();

  return useQuery({
    ...gamesQuery(activeClubId, filters ?? {}),
    // Page or window changed: hold the rows already on screen rather than
    // blanking the list back to a skeleton while the next set arrives.
    placeholderData: keepPreviousData,
    // Slower than the live scores: a rack lands every few minutes and a result
    // every twenty, so this is the ladder catching up, not a scoreboard.
    ...(poll && { refetchInterval: 15_000, refetchIntervalInBackground: false }),
  });
};
