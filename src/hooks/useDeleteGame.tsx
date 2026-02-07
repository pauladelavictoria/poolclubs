import { supabase } from "@/supabaseClient";
import { useAuth } from "./useAuth";
import { useMutation } from "@tanstack/react-query";

export const useDeleteGame = () => {
  const { user } = useAuth();

  async function deleteGame(id: string) {
    if (!user) {
      return;
    }

    const { error } = await supabase.from("games").delete().eq("id", id);

    if (error) {
      console.error(error);
      throw error;
    }
  }

  return useMutation({
    mutationFn: deleteGame,
  });
};
