import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/libs/supabase/browser";
import { useAuth } from "@/hooks/useAuth";
import { keys } from "@/libs/queryKeys";
import {
  gameTournamentsQuery,
  leagueFixturesQuery,
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
  buildLateEntry,
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

/** Every fixture still to play in a running league — see leagueFixturesQuery. */
export const useLeagueFixtures = () => {
  const { activeClubId } = useAuth();
  return useQuery(leagueFixturesQuery(activeClubId));
};

type NewTournament = {
  name: string;
  /** When it runs, as ISO days. A null start is a tournament with no date yet;
   *  a null end is a one-day one, or a league whose last week is not fixed. */
  starts_on: string | null;
  ends_on: string | null;
  /** What entry costs, as the organiser wrote it. */
  entry_fee: string | null;
  /** Free text for prizes or anything else worth telling entrants. */
  notes: string | null;
  /** Whether entrants owe money to be in the draw. */
  requires_payment: boolean;
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
  /** Only meaningful for a league — see libs/algorithms/leagueTable. */
  points_win: number;
  points_play: number;
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
     * A player joining a league that is already running: entered, then drawn
     * against everyone already in it, in fresh rounds after the last.
     *
     * Only a league — a knockout's seats are all spoken for the moment the
     * draw is cut, so a latecomer there is a new tournament, not a new row.
     * Two writes: if the fixtures fail the entrant is in the table with
     * nothing to play, which an admin can fix by removing them; the reverse
     * would leave fixtures against a player the tournament does not have.
     */
    addLateEntrant: useMutation({
      mutationFn: async ({
        tournament,
        playerId,
      }: {
        tournament: TournamentDetail;
        playerId: number;
      }) => {
        if (tournament.format !== "league" || tournament.status !== "running")
          throw new Error("not a running league");

        const opponents = tournament.tournament_players
          .map((e) => e.player_id)
          .filter((id) => id !== playerId);
        if (opponents.length === 0) throw new Error("no opponents");

        await supabase
          .from("tournament_players")
          .insert([{ tournament_id: tournament.id, player_id: playerId }])
          .throwOnError();

        const fromRound =
          Math.max(0, ...tournament.tournament_matches.map((m) => m.round)) + 1;

        await supabase
          .from("tournament_matches")
          .insert(
            rows(
              tournament.id,
              buildLateEntry(playerId, opponents, tournament.legs, fromRound),
            ),
          )
          .throwOnError();
      },
      onSuccess: refresh,
    }),

    /**
     * A player out of a running league, and their fixtures with them.
     *
     * `leaveTournament` is the entrant row alone, which is all a tournament
     * still taking entries has. Once the fixtures exist, leaving one behind is
     * a match nobody can play and a name the standings still count — so the
     * whole round robin they were in goes, played fixtures included.
     *
     * The games themselves are left where they are. A frame played in the club
     * happened, it is in the feed and in the Elo board, and a league changing
     * its mind about an entrant does not unplay it — only the fixture that
     * claimed it for the table is deleted.
     *
     * Fixtures first: a stranded entrant is visible and can be removed again,
     * where the reverse leaves fixtures against somebody the tournament does
     * not have.
     */
    removeEntrant: useMutation({
      mutationFn: async ({
        tournament,
        playerId,
      }: {
        tournament: TournamentDetail;
        playerId: number;
      }) => {
        if (tournament.format !== "league")
          throw new Error("only a league can lose an entrant mid-run");

        await supabase
          .from("tournament_matches")
          .delete()
          .eq("tournament_id", tournament.id)
          .or(`p1_id.eq.${playerId},p2_id.eq.${playerId}`)
          .throwOnError();

        await supabase
          .from("tournament_players")
          .delete()
          .eq("tournament_id", tournament.id)
          .eq("player_id", playerId)
          .throwOnError();
      },
      onSuccess: refresh,
    }),

    /** Admin-only, and only meaningful while entries are still open — RLS
     *  enforces the former, the page's own "open" gate the latter. */
    setPaid: useMutation({
      mutationFn: async ({
        tournamentId,
        playerId,
        paid,
      }: {
        tournamentId: number;
        playerId: number;
        paid: boolean;
      }) => {
        await supabase
          .from("tournament_players")
          .update({ paid })
          .eq("tournament_id", tournamentId)
          .eq("player_id", playerId)
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
