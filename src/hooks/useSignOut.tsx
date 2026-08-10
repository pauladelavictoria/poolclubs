import { supabase } from "@/supabaseClient";
import { useAuth } from "./useAuth";
import { useMutation } from "@tanstack/react-query";

export const useSignOut = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });
};
