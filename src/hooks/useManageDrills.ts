import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/libs/supabase/browser";
import { keys } from "@/libs/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import type { Drill } from "@/types";

/** Everything on a drill except the columns the database fills in. `created_by`
 *  is one of them: leaving it out is what keeps ownership unforgeable. `club_id`
 *  is another: it's stamped from the active club, not user-editable. */
export type DrillInput = Omit<
  Drill,
  "id" | "created_at" | "created_by" | "club_id"
>;

export const useManageDrills = () => {
  const queryClient = useQueryClient();
  const { activeClubId } = useAuth();

  const onSuccess = (drill?: Drill) => {
    queryClient.invalidateQueries({ queryKey: keys.drills.all });
    if (drill)
      queryClient.invalidateQueries({ queryKey: keys.drill.one(drill.id) });
  };

  return {
    createDrill: useMutation({
      // ponytail: a club drill is visible to every member of that club, and in
      // the global lobby every player in the app is a member — so a drill made
      // in there is published to all of them, with nobody but the operator able
      // to delete it. Left open on purpose rather than pre-emptively locked; if
      // it is ever abused, exclude the lobby from the `drills` INSERT policy in
      // sql/schema.sql.
      mutationFn: async (newDrill: DrillInput) => {
        if (!activeClubId) throw new Error("no active club");

        const { data } = await supabase
          .from("drills")
          .insert([{ ...newDrill, club_id: activeClubId }])
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
        // `count` is the only way to notice RLS refusing the row: a blocked
        // delete is not an error, just nothing deleted.
        const { count } = await supabase
          .from("drills")
          .delete({ count: "exact" })
          .eq("id", id)
          .throwOnError();

        if (!count) throw new Error("No se pudo borrar el ejercicio");
      },
      onSuccess: () => onSuccess(),
    }),
  };
};
