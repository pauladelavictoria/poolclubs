import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import type { Player, Category } from "@/types";

export type CreatePlayerInput = {
  name: string;
  category: Category;
};

export type UpdatePlayerInput = {
  id: number;
  name?: string;
  category?: Category;
};

export const useManagePlayers = () => {
  const queryClient = useQueryClient();
  const { activeClubId } = useAuth();

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["players"] });
  };

  return {
    // A player added here is a guest with no account — active straight away.
    // People who sign in arrive through join_club() as 'pending' instead.
    createPlayer: useMutation({
      mutationFn: async (newPlayer: CreatePlayerInput) => {
        if (!activeClubId) throw new Error("no active club");

        const { data } = await supabase
          .from("players")
          .insert([{ ...newPlayer, club_id: activeClubId, status: "active" }])
          .select()
          .single()
          .throwOnError();

        return data as Player;
      },
      onSuccess,
    }),

    updatePlayer: useMutation({
      mutationFn: async ({ id, ...updates }: UpdatePlayerInput) => {
        const { data } = await supabase
          .from("players")
          .update(updates)
          .eq("id", id)
          .select()
          .single()
          .throwOnError();

        return data as Player;
      },
      onSuccess,
    }),

    deletePlayer: useMutation({
      mutationFn: async (id: number) => {
        await supabase.from("players").delete().eq("id", id).throwOnError();
      },
      onSuccess,
    }),
  };
};
