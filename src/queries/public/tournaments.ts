import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";
import { CLUB_COLS, contains, rangeOf } from "./shared";
import type { PublicClub } from "./clubs";
import type {
  Discipline,
  Tournament,
  TournamentMatch,
  TournamentStatus,
} from "@/types";

export type PublicTournament = Tournament & { club: PublicClub | null };

/** One fixture, as much of it as a podium reads. `game` is three score columns
 *  riding on the fixture for the league tie-break — the games table itself is
 *  never listed. */
export type PublicPodiumMatch = Pick<
  TournamentMatch,
  | "id"
  | "bracket"
  | "round"
  | "p1_id"
  | "p2_id"
  | "winner_id"
  | "winner_to"
  | "winner_to_slot"
  | "loser_to"
  | "loser_to_slot"
  | "game"
>;

/** The entrant list with a name attached, so the ids a podium returns can be
 *  drawn without a second round trip. */
export type PublicPodiumEntrant = {
  player: {
    id: number;
    person: { name: string; avatar_url: string | null; slug: string } | null;
  } | null;
};

export type PublicTournamentListItem = PublicTournament & {
  tournament_players: { count: number }[];
  /** Optional because only the directory query pays for them: /search builds
   *  the same card from a leaner select, and a card with no fixtures simply
   *  draws no podium. */
  tournament_matches?: PublicPodiumMatch[];
  roster?: PublicPodiumEntrant[];
};

type PublicTournamentDetail = PublicTournament & {
  tournament_players: { player_id: number }[];
  tournament_matches: TournamentMatch[];
};

export type PublicTournamentsFilters = {
  q?: string;
  status?: TournamentStatus;
  format?: Tournament["format"];
  discipline?: Discipline;
  /** Set by a club's own profile, absent on the cross-club index. */
  clubId?: number;
  page?: number;
};

/**
 * What a finished card's podium costs, embedded in the list read rather than
 * fetched per card: the fixture graph and the entrants' names.
 *
 * Deliberately not `tournament_matches(*)` and deliberately not the games: a
 * knockout podium is a question about who lost to whom, which lives entirely on
 * the fixtures, and the three score columns here only break ties in a league
 * table. A tournament's ~14 fixtures are smaller than one of its games rows.
 */
const PODIUM_COLS =
  "tournament_matches(id, bracket, round, p1_id, p2_id, winner_id, winner_to, winner_to_slot, loser_to, loser_to_slot, game:games(player_1_id, player_1_score, player_2_score))," +
  " roster:tournament_players(player:players(id, person:people(name, avatar_url, slug)))";

export const publicTournamentsQuery = (
  filters: PublicTournamentsFilters = {},
) => {
  const { q, status, format, discipline, clubId, page = 1 } = filters;

  return queryOptions({
    queryKey: keys.public.tournaments(filters),
    queryFn: async () => {
      const supabase = getSupabase();
      let query = supabase
        .from("tournaments")
        .select(
          `*, club:clubs!inner(${CLUB_COLS}), tournament_players(count), ${PODIUM_COLS}`,
          { count: "exact" },
        )
        .eq("club.is_public", true)
        .order("created_at", { ascending: false });

      if (q?.trim()) query = query.ilike("name", contains(q));
      if (status) query = query.eq("status", status);
      if (format) query = query.eq("format", format);
      if (discipline) query = query.eq("discipline", discipline);
      if (clubId) query = query.eq("club_id", clubId);

      const [from, to] = rangeOf(page);
      const { data, count } = await query.range(from, to).throwOnError();

      return {
        tournaments: data as unknown as PublicTournamentListItem[],
        totalCount: count ?? 0,
      };
    },
  });
};

/** Mirrors tournamentQuery in queries/tournaments.ts — same one round trip for
 *  entrants and fixtures, plus the club, since out here the page has no club
 *  context to read it from. */
export const publicTournamentQuery = (id: number) =>
  queryOptions({
    queryKey: keys.public.tournament(id),
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("tournaments")
        .select(
          `*, club:clubs!inner(${CLUB_COLS}), tournament_players(player_id), tournament_matches(*, game:games(player_1_id, player_1_score, player_2_score, played_at))`,
        )
        .eq("id", id)
        .eq("club.is_public", true)
        .maybeSingle()
        .throwOnError();

      return (data as unknown as PublicTournamentDetail | null) ?? null;
    },
  });
