import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/libs/supabase/browser";
import { useAuth } from "@/hooks/useAuth";
import { optimisticList, tempId } from "@/libs/algorithms/optimistic";
import { keys } from "@/libs/queryKeys";
import { challengesQuery } from "@/queries/challenges";
import { sendPush } from "@/libs/server/push.functions";
import type { Challenge, ChallengeStatus } from "@/types";

export const useChallenges = () => {
  const { activeClubId } = useAuth();
  return useQuery(challengesQuery(activeClubId));
};

export const useManageChallenges = () => {
  const { activeClubId, player } = useAuth();
  const queryClient = useQueryClient();
  const key = keys.challenges.in(activeClubId);

  return {
    sendChallenge: useMutation({
      mutationFn: async ({
        toPlayerId,
        message,
      }: {
        toPlayerId: number;
        message?: string;
      }) => {
        if (!activeClubId || !player) throw new Error("no active club");

        const { data } = await supabase
          .from("challenges")
          .insert([
            {
              club_id: activeClubId,
              from_player_id: player.id,
              to_player_id: toPlayerId,
              message: message?.trim() || null,
            },
          ])
          .select("id")
          .single()
          .throwOnError();

        return data.id;
      },
      // Prepended: useChallenges orders by created_at descending.
      ...optimisticList<{ toPlayerId: number; message?: string }, Challenge>(
        queryClient,
        key,
        (rows, { toPlayerId, message }) => [
          {
            id: tempId(),
            club_id: activeClubId,
            from_player_id: player!.id,
            to_player_id: toPlayerId,
            status: "pending",
            message: message?.trim() || null,
            game_id: null,
            created_at: new Date().toISOString(),
          },
          ...rows,
        ],
      ),
      // After the spread, not before: a spread that ever grows an onSuccess of
      // its own would silently replace this one.
      //
      // Fired here rather than at the call sites, and never awaited: the
      // challenge is sent the moment the insert returns, and a push service
      // being slow or down is not something the challenger should wait for or
      // hear about. The bell shows it either way — see push.functions.ts.
      onSuccess: (id) => {
        void sendPush({ data: { kind: "challengeSent", id } }).catch(() => {});
      },
    }),

    respondToChallenge: useMutation({
      mutationFn: async ({
        id,
        status,
        gameId,
      }: {
        id: number;
        status: ChallengeStatus;
        gameId?: string;
      }) => {
        await supabase
          .from("challenges")
          .update({ status, ...(gameId ? { game_id: gameId } : {}) })
          .eq("id", id)
          .throwOnError();
      },
      ...optimisticList<
        { id: number; status: ChallengeStatus; gameId?: string },
        Challenge
      >(queryClient, key, (rows, { id, status, gameId }) =>
        rows.map((c) =>
          c.id === id ? { ...c, status, game_id: gameId ?? c.game_id } : c,
        ),
      ),
      // Only an answer is news to the challenger. This same mutation is also how
      // AddGamePage marks a challenge 'played', which nobody needs a push about.
      onSuccess: (_data, { id, status }) => {
        if (status !== "accepted" && status !== "declined") return;
        void sendPush({ data: { kind: "challengeAnswered", id } }).catch(
          () => {},
        );
      },
    }),

    cancelChallenge: useMutation({
      mutationFn: async (id: number) => {
        await supabase.from("challenges").delete().eq("id", id).throwOnError();
      },
      ...optimisticList<number, Challenge>(queryClient, key, (rows, id) =>
        rows.filter((c) => c.id !== id),
      ),
    }),
  };
};
