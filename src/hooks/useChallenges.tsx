import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { optimisticList, tempId } from "@/libs/optimistic";
import type { Challenge, ChallengeStatus } from "@/types";

/** Every challenge in the active club. A club is small enough that filtering
 *  the list client-side beats three query keys that all invalidate together. */
export const useGetChallenges = () => {
  const { activeClubId } = useAuth();

  return useQuery({
    queryKey: ["challenges", activeClubId],
    enabled: !!activeClubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("club_id", activeClubId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Challenge[];
    },
  });
};

/** Open challenges you are part of — pending or accepted, either direction. */
export const useMyChallenges = () => {
  const { player } = useAuth();
  const { data } = useGetChallenges();

  return (data ?? []).filter(
    (c) =>
      (c.status === "pending" || c.status === "accepted") &&
      (c.to_player_id === player?.id || c.from_player_id === player?.id),
  );
};

export const useManageChallenges = () => {
  const { activeClubId, player } = useAuth();
  const key = ["challenges", activeClubId];

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

        const { error } = await supabase.from("challenges").insert([
          {
            club_id: activeClubId,
            from_player_id: player.id,
            to_player_id: toPlayerId,
            message: message?.trim() || null,
          },
        ]);
        if (error) throw error;
      },
      // Prepended: useGetChallenges orders by created_at descending.
      ...optimisticList<{ toPlayerId: number; message?: string }, Challenge>(
        key,
        (rows, { toPlayerId, message }) => [
          {
            id: tempId(),
            club_id: activeClubId!,
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
        const { error } = await supabase
          .from("challenges")
          .update({ status, ...(gameId ? { game_id: gameId } : {}) })
          .eq("id", id);
        if (error) throw error;
      },
      ...optimisticList<
        { id: number; status: ChallengeStatus; gameId?: string },
        Challenge
      >(key, (rows, { id, status, gameId }) =>
        rows.map((c) =>
          c.id === id ? { ...c, status, game_id: gameId ?? c.game_id } : c,
        ),
      ),
    }),

    cancelChallenge: useMutation({
      mutationFn: async (id: number) => {
        const { error } = await supabase
          .from("challenges")
          .delete()
          .eq("id", id);
        if (error) throw error;
      },
      ...optimisticList<number, Challenge>(key, (rows, id) =>
        rows.filter((c) => c.id !== id),
      ),
    }),
  };
};
