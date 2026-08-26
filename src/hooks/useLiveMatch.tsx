import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { keys } from "@/libs/queryKeys";
import { uuid } from "@/libs/uuid";
import { liveMatchQuery, liveMatchesQuery } from "@/queries/live";
import {
  ABANDON_AFTER_MS,
  bump as bumpScore,
  unbump as unbumpScore,
} from "@/libs/night";
import type { Discipline, LiveMatch, Player } from "@/types";

/**
 * Every match being played in the active club right now.
 *
 * `poll` is for the wall display: a TV cannot focus its way back after a
 * dropped socket and nobody is going to pull-to-refresh it. Five seconds, not
 * thirty: the socket is what makes a bump instant, and when it is not there the
 * poll is the whole of how fast the wall is — half a minute of a stale score on
 * a screen above the table is what "it takes a while" was. One select of one
 * club's live rows, twelve times a minute, per wall display.
 */
export const useLiveMatches = ({ poll = false }: { poll?: boolean } = {}) => {
  const { activeClubId } = useAuth();
  return useQuery({
    ...liveMatchesQuery(activeClubId!),
    ...(poll && {
      refetchInterval: 5_000,
      refetchIntervalInBackground: false,
    }),
  });
};

/**
 * One match. The scoreboard's own query — see the note in queries/live.ts.
 *
 * `poll` is for a device nobody is holding: a tablet pinned to a table has no
 * focus event to refetch on and no thumb to pull down with, so a match finished
 * or abandoned from a phone across the room would leave it showing a score that
 * is no longer anybody's. Everything else here gets that for free — see the
 * note on useLiveMatches.
 */
export const useLiveMatch = (id: string, { poll = false }: { poll?: boolean } = {}) =>
  useQuery({
    ...liveMatchQuery(id),
    ...(poll && {
      refetchInterval: 5_000,
      refetchIntervalInBackground: false,
    }),
  });

export type NewLiveMatch = {
  player1: Player;
  player2: Player;
  /** Both or neither. `mode` is derived from them rather than passed, because
   *  the database's own CHECK says the same thing and two ways to state it is
   *  one way to disagree. */
  partner1?: Player | null;
  partner2?: Player | null;
  tableId: number | null;
  discipline: Discipline;
  raceTo: number;
  /** Set when the match came from an accepted challenge or a bracket fixture,
   *  so finishing can close it out in the same transaction. */
  challengeId?: number;
  tournamentMatchId?: string;
};

/**
 * Starting, scoring and finishing a live match.
 *
 * Scores are written straight to the row and come back to everyone else over
 * the realtime channel. They are also patched into this tab's own cache on tap:
 * a socket round trip is ~200ms, and a scoreboard that waits that long before
 * the number moves feels broken in the hand.
 */
export const useManageLiveMatch = () => {
  const queryClient = useQueryClient();
  const { activeClubId } = useAuth();

  const listKey = keys.liveMatches.in(activeClubId);

  /** The same row lives in two caches — the club's list and the scoreboard's
   *  own query — and a tap has to move both or the two screens disagree. */
  const patchLocal = (id: string, patch: Partial<LiveMatch>) => {
    queryClient.setQueryData<LiveMatch[]>(listKey, (rows) =>
      rows?.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
    queryClient.setQueryData<LiveMatch | null>(keys.liveMatch.one(id), (row) =>
      row ? { ...row, ...patch } : row,
    );
  };

  /**
   * One mutation for every score change, taking the patch rather than the
   * gesture: which racks move is libs/night.ts's decision, and it is checkable
   * there without a component. A null patch is a tap behind the finish sheet or
   * an undo with no rack left to take back — not an error, just not a write.
   */
  const scoreMatch = useMutation({
    mutationFn: async ({
      match,
      patch,
    }: {
      match: LiveMatch;
      patch: (match: LiveMatch) => Partial<LiveMatch> | null;
    }) => {
      const next = patch(match);
      if (!next) return;

      patchLocal(match.id, next);
      await supabase.from("live_matches").update(next).eq("id", match.id).throwOnError();
    },
    // The optimistic patch was a guess about the row we were shown. Whatever
    // the server ends up holding is the truth and it arrives over the socket —
    // this only covers a write that failed outright.
    onError: () => {
      queryClient.invalidateQueries({ queryKey: keys.liveMatches.all });
      queryClient.invalidateQueries({ queryKey: keys.liveMatch.all });
    },
  });

  return {
    /**
     * The id is generated here rather than by the database, the way a bracket's
     * fixtures are (libs/bracket.ts): the optimistic row and the row that comes
     * back over the socket then share an id, so the cache reconciles them by
     * identity and there is no stand-in to retire.
     */
    startMatch: useMutation({
      mutationFn: async (input: NewLiveMatch): Promise<LiveMatch> => {
        if (!activeClubId) throw new Error("no active club");

        const row = {
          id: uuid(),
          club_id: activeClubId,
          table_id: input.tableId,
          player_1_id: input.player1.id,
          player_2_id: input.player2.id,
          player_1b_id: input.partner1?.id ?? null,
          player_2b_id: input.partner2?.id ?? null,
          mode:
            input.partner1 && input.partner2
              ? ("doubles" as const)
              : ("single" as const),
          discipline: input.discipline,
          player_1_score: 0,
          player_2_score: 0,
          race_to: input.raceTo,
          last_side: null,
          challenge_id: input.challengeId ?? null,
          tournament_match_id: input.tournamentMatchId ?? null,
        };

        // An abandoned match still holds its table, and the person starting a
        // new one is standing at it. Clearing it here is what the second DELETE
        // policy exists for. Not atomic with the insert and does not need to
        // be: worst case the insert trips the one-per-table index and they tap
        // again.
        if (input.tableId !== null) {
          const stale = new Date(Date.now() - ABANDON_AFTER_MS).toISOString();
          await supabase
            .from("live_matches")
            .delete()
            .eq("table_id", input.tableId)
            .lt("updated_at", stale);
        }

        const { data, error } = await supabase
          .from("live_matches")
          .insert([row])
          .select()
          .single();

        // Thrown rather than `.throwOnError()` so the PostgrestError itself
        // reaches the caller: which of the several ways this can be refused it
        // was is the whole of what the toast needs to say.
        if (error) throw error;

        return data as LiveMatch;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.liveMatches.all }),
    }),

    scoreMatch,
    /** The plus button on one side. */
    bump: (match: LiveMatch, side: 1 | 2) =>
      scoreMatch.mutate({ match, patch: (m) => bumpScore(m, side) }),
    /** The minus button. On the row, not on the device — so either phone can
     *  correct the other one's mis-press. */
    unbump: (match: LiveMatch, side: 1 | 2) =>
      scoreMatch.mutate({ match, patch: (m) => unbumpScore(m, side) }),

    /**
     * One RPC, not an insert followed by an update.
     *
     * Both phones and the tablet all show the same Finish button, `games` has
     * nothing to deduplicate on, and two rows would land in the club feed and
     * in the Elo ranking. The row lock inside finish_live_match is the only
     * defence — see sql/live-night.sql.
     */
    finishMatch: useMutation({
      mutationFn: async (id: string): Promise<string> => {
        const { data, error } = await supabase.rpc("finish_live_match", { p_id: id });
        if (error) throw new Error(error.message);
        return data as string;
      },
      // The socket tells everyone else. This is so the tab that pressed the
      // button does not sit on a stale feed for its own round trip.
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: keys.liveMatches.all });
        queryClient.invalidateQueries({ queryKey: keys.games.all });
        queryClient.invalidateQueries({ queryKey: keys.challenges.all });
        queryClient.invalidateQueries({ queryKey: keys.tournaments.all });
        queryClient.invalidateQueries({ queryKey: keys.tournament.all });
      },
    }),

    /** Walked away, or started by mistake. Deletes the row; nothing is filed. */
    abandonMatch: useMutation({
      mutationFn: async (id: string) => {
        await supabase.from("live_matches").delete().eq("id", id).throwOnError();
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.liveMatches.all }),
    }),
  };
};
