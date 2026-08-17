import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";
import type { Tournament, TournamentMatch } from "@/types";

/** A row on the index: the tournament plus how many have entered it. */
export type TournamentListItem = Tournament & {
  tournament_players: { count: number }[];
};

export type TournamentDetail = Tournament & {
  tournament_players: { player_id: number }[];
  tournament_matches: TournamentMatch[];
};

export const tournamentsQuery = (clubId: number) =>
  queryOptions({
    queryKey: keys.tournaments.in(clubId),
    queryFn: async () => {
      const supabase = getSupabase();
      // The count comes back as an aggregate row rather than the entrant list:
      // the index only ever prints the number, and pulling every player_id for
      // every tournament to call .length on it is a bigger payload for the
      // same digit.
      const { data } = await supabase
        .from("tournaments")
        .select("*, tournament_players(count)")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false })
        .throwOnError();

      return data as unknown as TournamentListItem[];
    },
  });

/**
 * A tournament with everything drawn from it: its entrants and every fixture,
 * each fixture carrying the racks from its game. One round trip, because the
 * bracket and the tables are derived from the whole list either way.
 */
export const tournamentQuery = (id: number) =>
  queryOptions({
    queryKey: keys.tournament.one(id),
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("tournaments")
        .select(
          "*, tournament_players(player_id), tournament_matches(*, game:games(player_1_id, player_1_score, player_2_score, created_at))",
        )
        .eq("id", id)
        .single()
        .throwOnError();

      return data as unknown as TournamentDetail;
    },
  });
