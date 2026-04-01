import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
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

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["players"] });
  };

  async function createPlayerFn(newPlayer: CreatePlayerInput) {
    const { data, error } = await supabase
      .from("players")
      .insert([newPlayer])
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
