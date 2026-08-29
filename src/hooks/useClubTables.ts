import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/libs/supabase/browser";
import { useAuth } from "@/hooks/useAuth";
import { keys } from "@/libs/queryKeys";
import { clubTablesQuery } from "@/queries/live";

/** The venue's tables, in the order they are numbered on the wall. */
export const useClubTables = () => {
  const { activeClubId } = useAuth();
  return useQuery(clubTablesQuery(activeClubId!));
};

/**
 * The owner's list of tables. Admin-only in the database (one `FOR ALL` policy)
 * and reached from the club settings page, which is already admin-gated in its
 * route's beforeLoad.
 */
export const useManageClubTables = () => {
  const queryClient = useQueryClient();
  const { activeClubId } = useAuth();

  const onSuccess = () =>
    queryClient.invalidateQueries({ queryKey: keys.clubTables.all });

  return {
    addTable: useMutation({
      mutationFn: async (label: string) => {
        if (!activeClubId) throw new Error("no active club");
        await supabase
          .from("club_tables")
          // sort_order keeps its default: the list is ordered by it and then by
          // id, so tables come out in the order they were added. The column is
          // there for the day a club wants to drag them around; nothing does
          // yet. ponytail: no reorder UI until someone asks.
          .insert([{ club_id: activeClubId, label: label.trim() }])
          .throwOnError();
      },
      onSuccess,
    }),

    renameTable: useMutation({
      mutationFn: async ({ id, label }: { id: number; label: string }) => {
        await supabase
          .from("club_tables")
          .update({ label: label.trim() })
          .eq("id", id)
          .throwOnError();
      },
      onSuccess,
    }),

    /** Retiring a table is a delete — nothing durable points at one. A live
     *  match on it goes with it (ON DELETE CASCADE), which is the right answer
     *  for a table that has been taken out of the room. */
    removeTable: useMutation({
      mutationFn: async (id: number) => {
        await supabase.from("club_tables").delete().eq("id", id).throwOnError();
      },
      onSuccess: () => {
        onSuccess();
        queryClient.invalidateQueries({ queryKey: keys.liveMatches.all });
      },
    }),
  };
};
