import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import type { Game } from "@/types";

/** club_id is stamped by the hook, id and created_at by the database.
 *  played_at is the caller's — the form defaults it to now, but it is exactly
 *  the field a backdated result overrides. */
export type NewGame = Omit<Game, "id" | "created_at" | "club_id">;

export const useAddGame = () => {
  const { activeClubId } = useAuth();

  return useMutation({
    mutationFn: async (game: NewGame) => {
      if (!activeClubId) throw new Error("no active club");

      const { data } = await supabase
        .from("games")
        .insert([{ ...game, club_id: activeClubId }])
        // Returned so the caller can close the loop on a challenge — the row id
        // is only known here.
        .select()
        .single()
        .throwOnError();

      return data as Game;
    },
  });
};
