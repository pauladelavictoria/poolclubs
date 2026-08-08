import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";

export const useDeleteDrillLog = () => {
  const queryClient = useQueryClient();

  async function deleteDrillLog(id: number) {
    // `count` is the only way to notice RLS refusing the row: a blocked delete
    // returns no error, just nothing deleted.
    const { error, count } = await supabase
      .from("drill_logs")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      console.error(error);
      throw error;
    }
    if (!count) {
      throw new Error("No se pudo borrar el resultado");
    }
  }

  return useMutation({
    mutationFn: deleteDrillLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drill_logs"] });
      queryClient.invalidateQueries({ queryKey: ["training_plan"] });
    },
  });
};
