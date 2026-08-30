import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";
import { CLUB_TZ, dayKeyOf, dayRange } from "@/libs/algorithms/day";
import { daysInMonth } from "@/libs/algorithms/monthGrid";
import type { Game, GameMode } from "@/types";

export type UseGetGamesFilters = {
  date?: string; // ISO date string (e.g. "2025-02-08")
  page?: number; // 1-based page number
  pageSize?: number; // items per page
  /** Games this player took part in, on either side of either team. */
  playerId?: number;
  category?: number; // filter games where either player belongs to this category
  mode?: GameMode;
  /** The club's zone, for what `date` means. Part of the filters and so part of
   *  the query key, which is right: the same date in two zones is two different
   *  ranges. See libs/algorithms/day.ts. */
  tz?: string;
};

// A day is the club's night, 06:00 to 06:00, and the range comes from
// libs/algorithms/day.ts — where the zone lives and where the arithmetic is checked. It
// used to be built here as UTC midnights around a locally-formatted date, which
// dropped every result filed after 22:00 UTC out of its own night.
const getDateRange = (date: string, tz?: string) =>
  dayRange(date.split("T")[0], tz ?? CLUB_TZ);

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

/** One row, by id. What the editor loads when it is opened on a link rather
 *  than from the tape, and what its route primes. */
export const gameQuery = (id: string) =>
  queryOptions({
    queryKey: keys.game.one(id),
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("games")
        .select("*")
        .eq("id", id)
        .single()
        .throwOnError();

      return data as Game;
    },
  });

// Cache invalidation on inserts/updates lives in libs/browser/realtime.ts — one channel
// for the app, rather than one per hook instance.
export const gamesQuery = (
  clubId: number,
  filters: UseGetGamesFilters = {},
) => {
  const { date, page = 1, pageSize, playerId, category, mode, tz } = filters;

  return queryOptions({
    queryKey: keys.games.list(clubId, filters),
    queryFn: async () => {
      const supabase = getSupabase();
      let query = supabase
        .from("games")
        .select("*", { count: "exact" })
        // Every list in the app is one club's, and RLS allows more than one.
        .eq("club_id", clubId)
        .order("played_at", { ascending: false });

      if (mode) {
        query = query.eq("mode", mode);
      }

      if (date) {
        const { from, to } = getDateRange(date, tz);
        // Half-open: the instant one night ends is the instant the next begins,
        // so nothing can be counted twice or not at all.
        query = query.gte("played_at", from);
        query = query.lt("played_at", to);
      }

      if (playerId) {
        query = query.or(playedIn(playerId));
      }

      // Division lives on the player, not on the game, so it takes a lookup
      // first.
      if (category) {
        const { data: playersInCategory } = await supabase
          .from("players")
          .select("id")
          .eq("club_id", clubId)
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
    },
  });
};

/**
 * Which nights of a month were played on — the dots on the daily ranking's
 * calendar, so somebody looking for "the Thursday we had that tournament" can
 * see where the games are instead of clicking through empty days.
 *
 * One column and one month, so the whole answer is a few hundred timestamps at
 * worst. Bucketed here rather than grouped in SQL because a night runs 06:00 to
 * 06:00 of the *club's* clock and `dayKeyOf` is where that rule lives — a
 * `GROUP BY date_trunc('day', played_at)` would file every result between
 * midnight and six under the wrong night, which is the exact bug the ranges in
 * libs/algorithms/day.ts were written to fix.
 *
 * ponytail: client-side bucketing. Ceiling is a club with thousands of games in
 * one month; an RPC that takes the start hour is the upgrade.
 */
export const gameDaysQuery = (
  clubId: number | null | undefined,
  month: string,
  tz: string = CLUB_TZ,
) => {
  const days = daysInMonth(month);

  return queryOptions({
    queryKey: keys.games.days(clubId, month, tz),
    queryFn: async () => {
      const supabase = getSupabase();
      // The first night of the month to the last, in the club's zone. Not the
      // calendar month: the last night runs into the small hours of the 1st.
      const { from } = dayRange(days[0], tz);
      const { to } = dayRange(days[days.length - 1], tz);

      const { data } = await supabase
        .from("games")
        .select("played_at")
        .eq("club_id", clubId!)
        .gte("played_at", from)
        .lt("played_at", to)
        .throwOnError();

      return new Set(
        data.map((row) => dayKeyOf(Date.parse(row.played_at), tz)),
      );
    },
    enabled: clubId != null,
  });
};
