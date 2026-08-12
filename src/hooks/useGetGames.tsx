import { supabase } from "@/supabaseClient";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { keys } from "@/libs/queryKeys";
import type { Game, GameMode } from "@/types";

export type UseGetGamesFilters = {
  date?: string; // ISO date string (e.g. "2025-02-08")
  page?: number; // 1-based page number
  pageSize?: number; // items per page
  /** Games this player took part in, on either side of either team. */
  playerId?: number;
  category?: number; // filter games where either player belongs to this category
  mode?: GameMode;
};

const getDateRange = (date: string) => {
  const dateClean = date.split("T")[0];
  return {
    from: `${dateClean}T00:00:00.000Z`,
    to: `${dateClean}T23:59:59.999Z`,
  };
};

/** The four seats in a game. A row lists two ids for singles and four for
 *  doubles, so "was this player in it" is a question about all four columns. */
const SEATS = [
  "player_1_id",
  "player_2_id",
  "player_1b_id",
  "player_2b_id",
] as const;

/**
 * Matching on ids, not names.
 *
 * The names are copied onto the game row when it is written, so a player who is
 * renamed loses every result they had — the old rows still carry the old string.
 * Ids don't move. They also need no quoting, which the name version had to do by
 * hand because a comma in a name reads as another condition.
 */
const playedIn = (playerId: number) =>
  SEATS.map((seat) => `${seat}.eq.${playerId}`).join(",");

const playedInAny = (playerIds: number[]) =>
  SEATS.map((seat) => `${seat}.in.(${playerIds.join(",")})`).join(",");

// Cache invalidation on inserts/updates lives in libs/realtime.ts — one channel
// for the app, rather than one per hook instance.
export const useGetGames = (filters?: UseGetGamesFilters) => {
  const applied = filters ?? {};
  const { date, page = 1, pageSize, playerId, category, mode } = applied;
  const { activeClubId } = useAuth();

  async function fetchGames() {
    if (!activeClubId) throw new Error("no active club");

    let query = supabase
      .from("games")
      .select("*", { count: "exact" })
      // Every list in the app is one club's, and RLS allows more than one.
      .eq("club_id", activeClubId)
      .order("created_at", { ascending: false });

    if (mode) {
      query = query.eq("mode", mode);
    }

    if (date) {
      const { from, to } = getDateRange(date);
      query = query.gte("created_at", from);
      query = query.lte("created_at", to);
    }

    if (playerId) {
      query = query.or(playedIn(playerId));
    }

    // Division lives on the player, not on the game, so it takes a lookup first.
    if (category) {
      const { data: playersInCategory } = await supabase
        .from("players")
        .select("id")
        .eq("club_id", activeClubId)
        .eq("category", category)
        .throwOnError();

      // Nobody in this division has played, so no game can match.
      if (playersInCategory.length === 0) {
        return { games: [], totalCount: 0 };
      }
      query = query.or(playedInAny(playersInCategory.map((p) => p.id)));
    }

    if (page >= 1 && pageSize && pageSize >= 1) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    const { data, count } = await query.throwOnError();

    return {
      games: data as Game[],
      totalCount: count ?? null,
    };
  }

  return useQuery({
    queryKey: keys.games.list(activeClubId, applied),
    queryFn: fetchGames,
    enabled: !!activeClubId,
    // Page or window changed: hold the rows already on screen rather than
    // blanking the list back to a skeleton while the next set arrives.
    placeholderData: keepPreviousData,
  });
};
