import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/libs/supabase/browser";
import { useAuth } from "@/hooks/useAuth";
import { keys } from "@/libs/queryKeys";
import {
  gameTournamentsQuery,
  myPendingMatchesQuery,
  myTournamentIdsQuery,
  tournamentQuery,
  tournamentsQuery,
  type TournamentDetail,
  type TournamentListItem,
} from "@/queries/tournaments";
import {
  buildGroups,
  buildKnockout,
  buildLeague,
  groupCount,
  qualifiers,
  type PlannedMatch,
} from "@/libs/algorithms/bracket";
import { groupStandings } from "@/libs/algorithms/leagueTable";
import { sendPush } from "@/libs/server/push.functions";
import type {
  Category,
  Discipline,
  Player,
  Tournament,
  TournamentFormat,
  TournamentMatch,
} from "@/types";

export type { TournamentDetail, TournamentListItem };

/** PostgREST returns the aggregate as a one-row array, or none at all. */
export const entrantCount = (t: TournamentListItem) =>
  t.tournament_players[0]?.count ?? 0;

/** Both roots go stale together: a result changes the page and the index badge.
 *  The client is passed in because there is one per request under SSR — see
 *  libs/queryClient.ts. */
const refreshTournaments = (queryClient: QueryClient) => () => {
  queryClient.invalidateQueries({ queryKey: keys.tournaments.all });
  queryClient.invalidateQueries({ queryKey: keys.tournament.all });
};

export const useTournaments = () => {
  const { activeClubId } = useAuth();
  return useQuery(tournamentsQuery(activeClubId));
};

export const useTournament = (id?: number) =>
  useQuery({ ...tournamentQuery(id ?? 0), enabled: !!id });

export const useGameTournaments = (gameIds: string[]) =>
  useQuery(gameTournamentsQuery(gameIds));

/** Tournaments you're entered in, just the ids — enough to tell an open
 *  tournament you could join from one you're already part of. */
export const useMyTournamentIds = () => {
  const { player, activeClubId } = useAuth();
  return useQuery(myTournamentIdsQuery(player?.id, activeClubId));
};

/**
 * Your own fixtures still waiting to be played, across every tournament in
 * the active club — the "needs your action" half of the notification bell.
 * A match only counts once both slots are filled: an empty "winner of #3"
 * slot isn't yours to play yet.
 */
export const useMyPendingMatches = () => {
  const { player, activeClubId } = useAuth();
  return useQuery(myPendingMatchesQuery(player?.id, activeClubId));
};

type NewTournament = {
  name: string;
  format: TournamentFormat;
  category: Category | null;
  legs: 1 | 2;
  advance: number | null;
  /** Players left when a double-elimination draw turns single. 2 is the grand
   *  final — the whole draw played double elimination. */
  single_from: number;
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
  const queryClient = useQueryClient();
  const refresh = refreshTournaments(queryClient);

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
      // 'open' is the row's birth default, so creating a tournament and opening
      // its entries are the same moment — there is no later transition to hook.
      // Never awaited: whether the club heard about it is not the admin's
      // problem, and push.functions.ts decides who is even eligible.
      onSuccess: (tournament) => {
        refresh();
        void sendPush({
          data: { kind: "tournamentOpen", id: tournament.id },
        }).catch(() => {});
      },
    }),

    updateTournament: useMutation({
      mutationFn: async ({
        id,
        ...values
      }: Partial<NewTournament> & {
        id: number;
        status?: Tournament["status"];
      }) => {
        await supabase
          .from("tournaments")
          .update(values)
          .eq("id", id)
          .throwOnError();
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
              ? buildKnockout(seededIds, {
                  doubleElim: true,
                  singleFrom: tournament.single_from,
                })
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
            status:
              tournament.format === "group_knockout" ? "groups" : "running",
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
        if (p1Score === p2Score)
          throw new Error("a tournament match needs a winner");

        const { data: game } = await supabase
          .from("games")
          .insert([
            {
              club_id: activeClubId,
              mode: "single" as const,
              discipline,
              player_1_id: p1.id,
              player_1_score: p1Score,
              player_2_id: p2.id,
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
