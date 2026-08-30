import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";
import type { Tournament, TournamentMatch } from "@/types";

export type PendingMatch = Pick<TournamentMatch, "id" | "tournament_id"> & {
  tournament: Pick<Tournament, "id" | "name">;
};

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
          "*, tournament_players(player_id), tournament_matches(*, game:games(player_1_id, player_1_score, player_2_score, played_at))",
        )
        .eq("id", id)
        .single()
        .throwOnError();

      return data as unknown as TournamentDetail;
    },
  });

/**
 * Which tournament each of these games was played in, keyed by game id.
 *
 * A game carries no tournament_id — the pointer lives on tournament_matches —
 * so the feed asks for the handful of ids it is showing rather than joining
 * every game to a bracket it usually has nothing to do with.
 */
export const gameTournamentsQuery = (gameIds: string[]) =>
  queryOptions({
    queryKey: keys.tournaments.forGames(gameIds),
    enabled: gameIds.length > 0,
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("tournament_matches")
        .select("game_id, tournament:tournaments(id, name)")
        .in("game_id", gameIds)
        .throwOnError();

      const rows = (data ?? []) as unknown as {
        game_id: string;
        tournament: Pick<Tournament, "id" | "name"> | null;
      }[];

      return new Map(
        rows
          .filter((r) => r.tournament)
          .map((r) => [r.game_id, r.tournament!] as const),
      );
    },
  });

/** Tournaments you're entered in, just the ids — enough to tell an open
 *  tournament you could join from one you're already part of. */
export const myTournamentIdsQuery = (
  playerId: number | undefined,
  clubId: number | null | undefined,
) =>
  queryOptions({
    queryKey: keys.tournament.myEntries(playerId, clubId),
    enabled: !!playerId && !!clubId,
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("tournament_players")
        .select("tournament_id")
        .eq("player_id", playerId!)
        .throwOnError();

      return new Set((data ?? []).map((r) => r.tournament_id));
    },
  });

/**
 * Your own fixtures still waiting to be played, across every tournament in
 * the active club — the "needs your action" half of the notification bell.
 * A match only counts once both slots are filled: an empty "winner of #3"
 * slot isn't yours to play yet.
 */
export const myPendingMatchesQuery = (
  playerId: number | undefined,
  clubId: number | null | undefined,
) =>
  queryOptions({
    queryKey: keys.tournament.pendingMatches(playerId, clubId),
    enabled: !!playerId && !!clubId,
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("tournament_matches")
        .select("id, tournament_id, tournament:tournaments!inner(id, name)")
        .eq("tournament.club_id", clubId!)
        .or(`p1_id.eq.${playerId!},p2_id.eq.${playerId!}`)
        .is("winner_id", null)
        .not("p1_id", "is", null)
        .not("p2_id", "is", null)
        .throwOnError();

      return data as unknown as PendingMatch[];
    },
  });
