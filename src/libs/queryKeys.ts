import type { UseGetGamesFilters } from "@/queries/games";
import type { DrillLogsFilters, DrillsFilters } from "@/queries/drills";
import type { PublicClubsFilters } from "@/queries/public/clubs";
import type { PublicDrillsFilters } from "@/queries/public/drills";
import type { PublicPlayersFilters } from "@/queries/public/players";
import type { PublicTournamentsFilters } from "@/queries/public/tournaments";

/**
 * Every cache key in one place.
 *
 * These were bare string literals spread across fourteen hooks and
 * libs/browser/realtime.ts, where a socket event has to invalidate the exact key some
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

  /** A club's venue photos. Keyed by id rather than slug because the storage
   *  folder is the id, and the settings page has no slug to hand. */
  clubPhotos: {
    all: ["club-photos"] as const,
    in: (clubId?: number | null) => ["club-photos", clubId] as const,
  },

  /** The cross-club operator dashboard. Not club-scoped — it is every club. */
  operator: {
    clubs: ["operator-clubs"] as const,
  },

  /** Address suggestions from Photon. Its own root and nothing invalidates it:
   *  the answer to "Calle Mayor 12" does not change while a form is open. */
  places: {
    for: (q: string) => ["places", q] as const,
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
    /** Which nights of a month have games at all — the dots on the calendar.
     *  The zone is in the key because it decides which night a small-hours
     *  result lands on, exactly as it does for `list`. */
    days: (clubId: number | null | undefined, month: string, tz: string) =>
      ["games", "days", clubId, month, tz] as const,
  },

  /** One game, for the editor. Its own root rather than a member of `games`,
   *  so saving a correction does not have to refetch every filtered list to
   *  put the form back — the same split `drill` makes below. */
  game: {
    all: ["game"] as const,
    one: (id?: string) => ["game", id] as const,
  },

  drills: {
    all: ["drills"] as const,
    list: (f: DrillsFilters, clubId: number | null | undefined) =>
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
    list: (f: DrillLogsFilters) =>
      ["drill_logs", f.player_id, f.drill_id, f.limit] as const,
  },

  challenges: {
    all: ["challenges"] as const,
    in: (clubId?: number | null) => ["challenges", clubId] as const,
  },

  /** Matches being played right now. No key for check-in or the queue: those
   *  are columns on the membership, so they arrive with the roster. */
  liveMatches: {
    all: ["live_matches"] as const,
    in: (clubId?: number | null) => ["live_matches", clubId] as const,
  },

  /** One match has its own root, beside the club's list — the scoreboard is
   *  often the first thing a tab loads, and the list operations realtime runs
   *  over `liveMatches` are array edits that must not meet a single row. */
  liveMatch: {
    all: ["live_match"] as const,
    one: (id?: string) => ["live_match", id] as const,
  },

  clubTables: {
    all: ["club_tables"] as const,
    in: (clubId?: number | null) => ["club_tables", clubId] as const,
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
    // Scoped to one tournament rather than a club: a public visitor knows the
    // tournament and may not be in the club at all.
    onTournament: (tournamentId: number) =>
      ["comments", "tournament", tournamentId] as const,
  },

  /** People named by an @mention, looked up by slug rather than by club: a
   *  mention on a public thread can point at somebody from any club. */
  mentioned: {
    people: (slugs: readonly string[]) =>
      ["people", "mentioned", [...slugs].sort().join(",")] as const,
  },

  reactions: {
    all: ["reactions"] as const,
    in: (clubId?: number | null) => ["reactions", clubId] as const,
    onTournament: (tournamentId: number) =>
      ["reactions", "tournament", tournamentId] as const,
  },

  trainingPlan: {
    all: ["training_plan"] as const,
    of: (playerId?: number) => ["training_plan", playerId] as const,
  },

  /**
   * The public site. Its own root because these read different columns than the
   * club-scoped keys above — a signed-in visitor who also has a membership must
   * not be served the public, redacted copy of a row from the same cache entry.
   */
  public: {
    all: ["public"] as const,
    clubs: (f: PublicClubsFilters) =>
      // The box joined into one string rather than spread as four numbers: it
      // is one filter, and this keeps "no box" a single readable slot in the
      // devtools rather than four undefineds.
      ["public", "clubs", f.q, f.sort, f.page ?? 1, f.bbox?.join()] as const,
    club: (slug?: string) => ["public", "club", slug] as const,
    clubPins: () => ["public", "club-pins"] as const,
    players: (f: PublicPlayersFilters) =>
      [
        "public",
        "players",
        f.q,
        f.clubId,
        f.category,
        f.sort,
        f.page ?? 1,
      ] as const,
    /** Keyed on the person's slug, which is what the public URL carries. */
    person: (slug?: string) => ["public", "person", slug] as const,
    tournaments: (f: PublicTournamentsFilters) =>
      [
        "public",
        "tournaments",
        f.q,
        f.status,
        f.format,
        f.discipline,
        f.clubId,
        f.page ?? 1,
      ] as const,
    tournament: (id?: number) => ["public", "tournament", id] as const,
    drills: (f: PublicDrillsFilters) =>
      ["public", "drills", f.q, f.difficulty, f.skill_type] as const,
    drill: (id?: number) => ["public", "drill", id] as const,
    search: (q?: string) => ["public", "search", q] as const,
  },
};

/** The shape realtime.ts needs: a table whose rows are cached per club. */
export type ClubScopedKeys = {
  all: readonly string[];
  in: (clubId?: number | null) => readonly unknown[];
};
