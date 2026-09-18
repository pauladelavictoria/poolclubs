import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/libs/supabase/browser";
import { useAuth } from "@/hooks/useAuth";
import { keys } from "@/libs/queryKeys";
import { clubTablesQuery } from "@/queries/live";
import type { TableSize, TableType } from "@/types";

/** The venue's tables, in the order they are numbered on the wall. */
export const useClubTables = () => {
  const { activeClubId } = useAuth();
  return useQuery(clubTablesQuery(activeClubId!));
};

/**
 * Each table's camera URL, admin-only both by policy and by which page ever
 * fetches it — never joined onto `club_tables` itself, since that row is
 * readable by any member and by anon for a public club, and this URL
 * routinely carries the camera's own password (`rtsp://user:pass@host/...`).
 */
export const useClubTableCameras = () => {
  const { activeClubId } = useAuth();
  return useQuery({
    queryKey: keys.clubTableCameras.in(activeClubId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_table_cameras")
        .select("table_id, camera_url")
        .eq("club_id", activeClubId!);
      if (error) throw error;
      return new Map(data.map((row) => [row.table_id, row.camera_url]));
    },
    enabled: !!activeClubId,
  });
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

    /** The room's own facts about the table: what it's built for, how big,
     *  who made it, what's on it. type and size are always sent together —
     *  even when only one changed — because club_tables_type_size_check
     *  evaluates the whole row: writing type alone while a now-incompatible
     *  size sits in the row would fail the constraint. ClubTablesCard is
     *  what clears the staged size whenever the staged type changes; this
     *  mutation just sends whatever it is given. */
    updateTableDetails: useMutation({
      mutationFn: async ({
        id,
        type,
        size,
        brand,
        felt,
      }: {
        id: number;
        type?: TableType | null;
        size?: TableSize | null;
        brand?: string | null;
        felt?: string | null;
      }) => {
        const patch: {
          type?: TableType | null;
          size?: TableSize | null;
          brand?: string | null;
          felt?: string | null;
        } = {};
        if (type !== undefined) patch.type = type;
        if (size !== undefined) patch.size = size;
        if (brand !== undefined) patch.brand = brand?.trim() || null;
        if (felt !== undefined) patch.felt = felt?.trim() || null;
        await supabase
          .from("club_tables")
          .update(patch)
          .eq("id", id)
          .throwOnError();
      },
      onSuccess,
    }),

    /** A separate table, not a `club_tables` column — see
     *  `useClubTableCameras` for why. An empty/blank URL deletes the row
     *  rather than storing an empty string, so "no camera set" has one
     *  representation. */
    updateTableCamera: useMutation({
      mutationFn: async ({
        id,
        cameraUrl,
      }: {
        id: number;
        cameraUrl: string | null;
      }) => {
        if (!activeClubId) throw new Error("no active club");
        const url = cameraUrl?.trim() || null;
        if (url) {
          await supabase
            .from("club_table_cameras")
            .upsert({ table_id: id, club_id: activeClubId, camera_url: url })
            .throwOnError();
        } else {
          await supabase
            .from("club_table_cameras")
            .delete()
            .eq("table_id", id)
            .throwOnError();
        }
      },
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: keys.clubTableCameras.in(activeClubId),
        }),
    }),

    /** The floor plan's Save button: every placed/moved/rotated/unplaced
     *  table in one round trip. Plain per-row updates rather than a batch
     *  RPC — a club has a handful of tables, RLS already scopes every row to
     *  an admin, and a half-saved layout (one row failing) is stale UI, not
     *  a correctness problem the way a half-saved game result would be. */
    saveTableLayout: useMutation({
      mutationFn: async (
        placements: {
          id: number;
          mapX: number | null;
          mapY: number | null;
          mapRotation: number | null;
        }[],
      ) => {
        await Promise.all(
          placements.map(({ id, mapX, mapY, mapRotation }) =>
            supabase
              .from("club_tables")
              .update({ map_x: mapX, map_y: mapY, map_rotation: mapRotation })
              .eq("id", id)
              .throwOnError(),
          ),
        );
      },
      onSuccess,
    }),
  };
};
