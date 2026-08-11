import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { queryClient } from "@/libs/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { keys } from "@/libs/queryKeys";
import {
  buildGroups,
  buildKnockout,
  buildLeague,
  groupCount,
  qualifiers,
  type PlannedMatch,
} from "@/libs/bracket";
import { groupStandings } from "@/libs/leagueTable";
import type {
  Category,
  Discipline,
  Player,
  Tournament,
  TournamentFormat,
  TournamentMatch,
} from "@/types";

export type TournamentDetail = Tournament & {
  tournament_players: { player_id: number }[];
  tournament_matches: TournamentMatch[];
};

/** Both roots go stale together: a result changes the page and the index badge. */
const refresh = () => {
  queryClient.invalidateQueries({ queryKey: keys.tournaments.all });
  queryClient.invalidateQueries({ queryKey: keys.tournament.all });
};

export const useGetTournaments = () => {
  const { activeClubId } = useAuth();

  return useQuery({
    queryKey: keys.tournaments.in(activeClubId),
    enabled: !!activeClubId,
    queryFn: async () => {
      if (!activeClubId) throw new Error("no active club");

      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .eq("club_id", activeClubId)
        .order("created_at", { ascending: false })
        .throwOnError();

      return data as Tournament[];
    },
  });
};

/**
 * A tournament with everything drawn from it: its entrants and every fixture,
 * each fixture carrying the racks from its game. One round trip, because the
 * bracket and the tables are derived from the whole list either way.
 */
export const useGetTournament = (id?: number) =>
  useQuery({
    queryKey: keys.tournament.one(id),
    enabled: !!id,
    queryFn: async () => {
      // `enabled` already stops this running without an id, but that is a
      // runtime guarantee and the query builder wants a compile-time one.
      if (!id) throw new Error("no tournament");

      const { data } = await supabase
        .from("tournaments")
        .select(
          "*, tournament_players(player_id), tournament_matches(*, game:games(player_1_id, player_1_score, player_2_score, created_at))",
        )
        .eq("id", id)
        .single()
        .throwOnError();

      return data as TournamentDetail;
    },
  });

/**
 * Which tournament each of these games was played in, keyed by game id.
 *
 * A game carries no tournament_id — the pointer lives on tournament_matches —
 * so the feed asks for the handful of ids it is showing rather than joining
 * every game to a bracket it usually has nothing to do with.
 */
export const useGameTournaments = (gameIds: string[]) =>
  useQuery({
    queryKey: keys.tournaments.forGames(gameIds),
    enabled: gameIds.length > 0,
    queryFn: async () => {
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

export type NewTournament = {
  name: string;
  format: TournamentFormat;
  category: Category | null;
  legs: 1 | 2;
  advance: number | null;
  discipline: Discipline;
  race_to: number;
  race_semi: number | null;
  race_final: number | null;
};

/** Rows for one insert. The bracket's pointers are client-side uuids, which is
 *  why they can all be written at once. */
const rows = (tournamentId: number, matches: PlannedMatch[]) =>
  matches.map((m) => ({ ...m, tournament_id: tournamentId }));

export const useManageTournaments = () => {
  const { activeClubId, player } = useAuth();

  return {
    createTournament: useMutation({
      mutationFn: async (values: NewTournament) => {
        if (!activeClubId) throw new Error("no active club");

        const { data } = await supabase
          .from("tournaments")
          .insert([{ ...values, club_id: activeClubId }])
          .select()
          .single()
          .throwOnError();

        return data as Tournament;
      },
      onSuccess: refresh,
    }),

    updateTournament: useMutation({
      mutationFn: async ({
        id,
        ...values
      }: Partial<NewTournament> & { id: number; status?: Tournament["status"] }) => {
        await supabase.from("tournaments").update(values).eq("id", id).throwOnError();
      },
      onSuccess: refresh,
    }),

    deleteTournament: useMutation({
      mutationFn: async (id: number) => {
        await supabase.from("tournaments").delete().eq("id", id).throwOnError();
      },
      onSuccess: refresh,
    }),

    /** Entering yourself. RLS allows your own player row, or any if you own the club. */
    joinTournament: useMutation({
      mutationFn: async ({
        tournamentId,
        playerId,
      }: {
        tournamentId: number;
        playerId?: number;
      }) => {
        const entrant = playerId ?? player?.id;
        if (!entrant) throw new Error("no player");

        await supabase
          .from("tournament_players")
          .insert([{ tournament_id: tournamentId, player_id: entrant }])
          .throwOnError();
      },
      onSuccess: refresh,
    }),

    leaveTournament: useMutation({
      mutationFn: async ({
        tournamentId,
        playerId,
      }: {
        tournamentId: number;
        playerId?: number;
      }) => {
        const entrant = playerId ?? player?.id;
        if (!entrant) throw new Error("no player");

        await supabase
          .from("tournament_players")
          .delete()
          .eq("tournament_id", tournamentId)
          .eq("player_id", entrant)
          .throwOnError();
      },
      onSuccess: refresh,
    }),

    /**
     * Cuts the fixtures. `seededIds` is the field strongest first — the caller
     * has the ranking, so it does the seeding.
     *
     * A group tournament stops at 'groups': its bracket cannot be drawn until
     * the groups have finished and the qualifiers are known.
     */
    startTournament: useMutation({
      mutationFn: async ({
        tournament,
        seededIds,
      }: {
        tournament: Tournament;
        seededIds: number[];
      }) => {
        const matches =
          tournament.format === "league"
            ? buildLeague(seededIds, tournament.legs)
            : tournament.format === "double_elim"
              ? buildKnockout(seededIds, { doubleElim: true })
              : buildGroups(
                  seededIds,
                  groupCount(tournament.advance ?? 2),
                  tournament.legs,
                );

        if (matches.length === 0) throw new Error("not enough entrants");

        await supabase
          .from("tournament_matches")
          .insert(rows(tournament.id, matches))
          .throwOnError();

        await supabase
          .from("tournaments")
          .update({
            status: tournament.format === "group_knockout" ? "groups" : "running",
          })
          .eq("id", tournament.id)
          .throwOnError();
      },
      onSuccess: refresh,
    }),

    /** Second half of a group tournament, once every group match has a result. */
    generateKnockout: useMutation({
      mutationFn: async (tournament: TournamentDetail) => {
        const advance = tournament.advance ?? 2;
        const groups = groupCount(advance);
        const groupMatches = tournament.tournament_matches.filter(
          (m) => m.bracket === "group",
        );

        if (groupMatches.some((m) => m.winner_id === null)) {
          throw new Error("groups unfinished");
        }

        const entrants = tournament.tournament_players.map((p) => p.player_id);
        const tables = groupStandings(entrants, groupMatches, groups);
        const seeds = qualifiers(tables, advance);
        const matches = buildKnockout(seeds, { doubleElim: false });

        await supabase
          .from("tournament_matches")
          .insert(rows(tournament.id, matches))
          .throwOnError();

        await supabase
          .from("tournaments")
          .update({ status: "running" })
          .eq("id", tournament.id)
          .throwOnError();
      },
      onSuccess: refresh,
    }),

    /**
     * A result is a normal game plus a pointer to it, so tournament play lands
     * in the club feed and both rankings without a second score model.
     *
     * Two writes, not one, because the game's id only exists after its insert.
     * If the second fails the game stands on its own and the match can be filed
     * again — the wrong way round would leave a match claiming a game that is
     * not there.
     */
    recordResult: useMutation({
      mutationFn: async ({
        match,
        p1,
        p2,
        p1Score,
        p2Score,
        discipline,
      }: {
        match: TournamentMatch;
        p1: Player;
        p2: Player;
        p1Score: number;
        p2Score: number;
        /** The tournament's, not the players' — a tournament is one game. */
        discipline: Discipline;
      }) => {
        if (!activeClubId) throw new Error("no active club");
        if (p1Score === p2Score) throw new Error("a tournament match needs a winner");

        const { data: game } = await supabase
          .from("games")
          .insert([
            {
              club_id: activeClubId,
              mode: "single" as const,
              discipline,
              player_1_id: p1.id,
              player_1_name: p1.name,
              player_1_score: p1Score,
              player_2_id: p2.id,
              player_2_name: p2.name,
              player_2_score: p2Score,
            },
          ])
          .select()
          .single()
          .throwOnError();

        await supabase
          .from("tournament_matches")
          .update({
            game_id: game!.id,
            winner_id: p1Score > p2Score ? p1.id : p2.id,
          })
          .eq("id", match.id)
          .throwOnError();
      },
      onSuccess: () => {
        refresh();
        // The game itself belongs to the club feed and the rankings.
        queryClient.invalidateQueries({ queryKey: keys.games.all });
      },
    }),
  };
};
