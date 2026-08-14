import type { UseGetGamesFilters } from "@/hooks/useGetGames";
import type { UseGetDrillLogsFilters } from "@/hooks/useGetDrillLogs";
import type { UseGetDrillsFilters } from "@/hooks/useGetDrills";

/**
 * Every cache key in one place.
 *
 * These were bare string literals spread across fourteen hooks and
 * libs/realtime.ts, where a socket event has to invalidate the exact key some
 * other file invented. A typo there doesn't fail — the screen just quietly stops
 * updating, which is the worst kind of bug to go looking for.
 *
 * `all` is the prefix react-query matches partially, so it invalidates every
 * club's or player's copy at once. The narrower function is what a query
 * subscribes with.
 */
export const keys = {
  players: {
    all: ["players"] as const,
    in: (clubId?: number | null) => ["players", clubId] as const,
  },

  clubMembers: {
    all: ["club-members"] as const,
    in: (clubId?: number | null) => ["club-members", clubId] as const,
  },

  clubPreview: {
    for: (code?: string) => ["club-preview", code] as const,
  },

  games: {
    all: ["games"] as const,
    // Positional rather than the filters object: react-query hashes either one
    // deterministically, but a flat key is what shows up readable in devtools.
    list: (clubId: number | null | undefined, f: UseGetGamesFilters) =>
      [
        "games",
        clubId,
        f.date,
        f.page ?? 1,
        f.pageSize,
        f.playerId,
        f.category,
        f.mode,
      ] as const,
  },

  drills: {
    all: ["drills"] as const,
    list: (f: UseGetDrillsFilters, clubId: number | null | undefined) =>
      ["drills", clubId, f.difficulty, f.skill_type] as const,
  },

  /** A single drill has its own root, so saving one refreshes its page without
   *  refetching every filtered list. */
  drill: {
    all: ["drill"] as const,
    one: (id?: number) => ["drill", id] as const,
  },

  drillLogs: {
    all: ["drill_logs"] as const,
    list: (f: UseGetDrillLogsFilters) =>
      ["drill_logs", f.player_id, f.drill_id, f.limit] as const,
  },

  challenges: {
    all: ["challenges"] as const,
    in: (clubId?: number | null) => ["challenges", clubId] as const,
  },

  tournaments: {
    all: ["tournaments"] as const,
    in: (clubId?: number | null) => ["tournaments", clubId] as const,
    /** Which tournament a batch of games belongs to — under the same root, so a
     *  filed result invalidates it with everything else. */
    forGames: (gameIds: string[]) => ["tournaments", "games", gameIds] as const,
  },

  /** One tournament carries its entrants and every fixture, so it gets its own
   *  root — filing a result refreshes the page without refetching the index. */
  tournament: {
    all: ["tournament"] as const,
    one: (id?: number) => ["tournament", id] as const,
    /** Under the same "tournament" root, so a result or a join/leave — both
     *  already invalidate every tournament query — refreshes these too. */
    pendingMatches: (playerId?: number, clubId?: number | null) =>
      ["tournament", "pending-matches", playerId, clubId] as const,
    myEntries: (playerId?: number, clubId?: number | null) =>
      ["tournament", "my-entries", playerId, clubId] as const,
  },

  comments: {
    all: ["comments"] as const,
    in: (clubId?: number | null) => ["comments", clubId] as const,
  },

  reactions: {
    all: ["reactions"] as const,
    in: (clubId?: number | null) => ["reactions", clubId] as const,
  },

  trainingPlan: {
    all: ["training_plan"] as const,
    of: (playerId?: number) => ["training_plan", playerId] as const,
  },
};

/** The shape realtime.ts needs: a table whose rows are cached per club. */
export type ClubScopedKeys = {
  all: readonly string[];
  in: (clubId?: number | null) => readonly unknown[];
};
