import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
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
  const queryClient = useQueryClient();
  const { activeClubId, player } = useAuth();

  const onSuccess = () =>
    queryClient.invalidateQueries({ queryKey: ["challenges"] });

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
      onSuccess,
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
      onSuccess,
    }),

    cancelChallenge: useMutation({
      mutationFn: async (id: number) => {
        const { error } = await supabase.from("challenges").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess,
    }),
  };
};
