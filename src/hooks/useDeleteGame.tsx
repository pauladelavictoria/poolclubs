import { supabase } from "@/supabaseClient";
import { useAuth } from "./useAuth";
import { useMutation } from "@tanstack/react-query";

export const useDeleteGame = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) return;
      await supabase.from("games").delete().eq("id", id).throwOnError();
    },
  });
};
