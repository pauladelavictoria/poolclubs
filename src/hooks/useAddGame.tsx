import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import type { Game } from "@/types";

/** club_id is stamped by the hook, id and created_at by the database. */
export type NewGame = Omit<Game, "id" | "created_at" | "club_id">;

export const useAddGame = () => {
  const { activeClubId } = useAuth();

  async function addGame(game: NewGame) {
    if (!activeClubId) throw new Error("no active club");

    const { data, error } = await supabase
      .from("games")
      .insert([{ ...game, club_id: activeClubId }])
      // Returned so the caller can close the loop on a challenge — the row id
      // is only known here.
      .select()
      .single();

    if (error) {
      console.error(error);
      throw error;
    }
    return data as Game;
  }

  return useMutation({
    mutationFn: addGame,
  });
};
