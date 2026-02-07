import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import type { Game } from "@/types";


export const useAddGame = () => {
  async function addGame(game: Game) {

    const { error } = await supabase.from("games").insert([
      game,
    ]);

    if (error) {
      console.error(error);
      throw error;
    }
  }

  return useMutation({
    mutationFn: addGame,
  });
};
