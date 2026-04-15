import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";

type AddDrillLogInput = {
  drill_id: number;
  player_id: number;
  score: number;
  max_score: number;
  notes?: string;
};

export const useAddDrillLog = () => {
  const queryClient = useQueryClient();

  async function addDrillLog(log: AddDrillLogInput) {
    const { data, error } = await supabase
      .from("drill_logs")
      .insert([log])
      .select()
      .single();

    if (error) {
      console.error(error);
      throw error;
    }

    return data;
  }

  return useMutation({
    mutationFn: addDrillLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drill_logs"] });
    },
  });
};
