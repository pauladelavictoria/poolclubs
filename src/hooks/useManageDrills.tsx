import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import type { Drill } from "@/types";

/** Everything on a drill except the columns the database fills in. `created_by`
 *  is one of them: leaving it out is what keeps ownership unforgeable. */
export type DrillInput = Omit<Drill, "id" | "created_at" | "created_by">;

export const useManageDrills = () => {
  const queryClient = useQueryClient();

  const onSuccess = (drill?: Drill) => {
    queryClient.invalidateQueries({ queryKey: ["drills"] });
    if (drill) queryClient.invalidateQueries({ queryKey: ["drill", drill.id] });
  };

  return {
    createDrill: useMutation({
      mutationFn: async (newDrill: DrillInput) => {
        const { data } = await supabase
          .from("drills")
          .insert([newDrill])
          .select()
          .single()
          .throwOnError();

        return data as Drill;
      },
      onSuccess,
    }),

    updateDrill: useMutation({
      mutationFn: async ({ id, ...updates }: DrillInput & { id: number }) => {
        const { data } = await supabase
          .from("drills")
          .update(updates)
          .eq("id", id)
          .select()
          .single()
          .throwOnError();

        return data as Drill;
      },
      onSuccess,
    }),

    deleteDrill: useMutation({
      mutationFn: async (id: number) => {
        await supabase.from("drills").delete().eq("id", id).throwOnError();
      },
      onSuccess: () => onSuccess(),
    }),
  };
};
