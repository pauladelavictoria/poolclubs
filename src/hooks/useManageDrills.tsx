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

  async function createDrillFn(newDrill: DrillInput) {
    const { data, error } = await supabase
      .from("drills")
      .insert([newDrill])
      .select()
      .single();

    if (error) {
      console.error(error);
      throw error;
    }
    return data as Drill;
  }

  async function updateDrillFn({ id, ...updates }: DrillInput & { id: number }) {
    const { data, error } = await supabase
      .from("drills")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(error);
      throw error;
    }
    return data as Drill;
  }

  async function deleteDrillFn(id: number) {
    const { error } = await supabase.from("drills").delete().eq("id", id);

    if (error) {
      console.error(error);
      throw error;
    }
  }

  return {
    createDrill: useMutation({ mutationFn: createDrillFn, onSuccess }),
    updateDrill: useMutation({ mutationFn: updateDrillFn, onSuccess }),
    deleteDrill: useMutation({
      mutationFn: deleteDrillFn,
      onSuccess: () => onSuccess(),
    }),
  };
};
