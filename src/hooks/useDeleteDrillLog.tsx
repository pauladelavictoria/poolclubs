import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { keys } from "@/libs/queryKeys";

export const useDeleteDrillLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      // `count` is the only way to notice RLS refusing the row: a blocked delete
      // is not an error, just nothing deleted.
      const { count } = await supabase
        .from("drill_logs")
        .delete({ count: "exact" })
        .eq("id", id)
        .throwOnError();

      if (!count) throw new Error("No se pudo borrar el resultado");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.drillLogs.all });
      queryClient.invalidateQueries({ queryKey: keys.trainingPlan.all });
    },
  });
};
