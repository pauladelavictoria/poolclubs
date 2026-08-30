import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/libs/supabase/browser";
import { keys } from "@/libs/queryKeys";

type AddDrillLogInput = {
  drill_id: number;
  player_id: number;
  score: number;
  max_score: number;
  notes?: string;
};

export const useAddDrillLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (log: AddDrillLogInput) => {
      const { data } = await supabase
        .from("drill_logs")
        .insert([log])
        .select()
        .single()
        .throwOnError();

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.drillLogs.all });
    },
  });
};
