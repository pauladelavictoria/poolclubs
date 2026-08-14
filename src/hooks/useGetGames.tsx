import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { gamesQuery } from "@/queries/games";
import type { UseGetGamesFilters } from "@/queries/games";

export type { UseGetGamesFilters };

// The query itself lives in src/queries/games.ts so a route loader can prime the
// same key before this runs.
export const useGetGames = (filters?: UseGetGamesFilters) => {
  const { activeClubId } = useAuth();

  return useQuery({
    ...gamesQuery(activeClubId, filters ?? {}),
    // Page or window changed: hold the rows already on screen rather than
    // blanking the list back to a skeleton while the next set arrives.
    placeholderData: keepPreviousData,
  });
};
