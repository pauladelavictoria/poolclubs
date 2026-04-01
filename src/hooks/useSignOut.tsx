import { supabase } from "@/supabaseClient";
import { useAuth } from "./useAuth";
import { useMutation } from "@tanstack/react-query";

export const useSignOut = () => {
  const { user } = useAuth();

  async function signOutFn() {
    if (!user) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
      throw error;
    }
  }

  return useMutation({
    mutationFn: signOutFn,
  });
};
