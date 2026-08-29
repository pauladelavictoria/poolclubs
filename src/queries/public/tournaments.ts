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

export type PublicTournamentListItem = PublicTournament & {
  tournament_players: { count: number }[];
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
          `*, club:clubs!inner(${CLUB_COLS}), tournament_players(count)`,
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
