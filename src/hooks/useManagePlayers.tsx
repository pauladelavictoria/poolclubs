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

  // A player added here is a guest with no account — active straight away.
  // People who sign in arrive through join_club() as 'pending' instead.
  async function createPlayerFn(newPlayer: CreatePlayerInput) {
    if (!activeClubId) throw new Error("no active club");

    const { data, error } = await supabase
      .from("players")
      .insert([{ ...newPlayer, club_id: activeClubId, status: "active" }])
      .select()
      .single();

    if (error) {
      console.error(error);
      throw error;
    }
    return data as Player;
  }

  async function updatePlayerFn({ id, ...updates }: UpdatePlayerInput) {
    const { data, error } = await supabase
      .from("players")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(error);
      throw error;
    }
    return data as Player;
  }

  async function deletePlayerFn(id: number) {
    const { error } = await supabase.from("players").delete().eq("id", id);

    if (error) {
      console.error(error);
      throw error;
    }
  }

  return {
    createPlayer: useMutation({ mutationFn: createPlayerFn, onSuccess }),
    updatePlayer: useMutation({ mutationFn: updatePlayerFn, onSuccess }),
    deletePlayer: useMutation({ mutationFn: deletePlayerFn, onSuccess }),
  };
};
