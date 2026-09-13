import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { keys } from "@/libs/queryKeys";
import {
  getYoutubeConnection,
  disconnectYoutube,
  listClubStreams,
  createClubStream,
  deleteClubStream,
} from "@/libs/server/youtube.functions";

/** The club's YouTube connection and its per-table streams —
 *  docs/youtube-streaming.md §2.6. Admin-only in the database itself
 *  (club_youtube/club_streams deny all anon/authenticated), so these hooks
 *  are only ever mounted from the already admin-gated settings screen. */
export const useYoutubeConnection = () => {
  const { activeClubId } = useAuth();
  return useQuery({
    queryKey: keys.youtubeConnection.of(activeClubId),
    queryFn: () => getYoutubeConnection({ data: { clubId: activeClubId! } }),
    enabled: !!activeClubId,
  });
};

export const useClubStreams = () => {
  const { activeClubId } = useAuth();
  return useQuery({
    queryKey: keys.clubStreams.in(activeClubId),
    queryFn: () => listClubStreams({ data: { clubId: activeClubId! } }),
    enabled: !!activeClubId,
  });
};

export const useManageClubYoutube = () => {
  const queryClient = useQueryClient();
  const { activeClubId } = useAuth();

  return {
    disconnect: useMutation({
      mutationFn: async () => {
        if (!activeClubId) throw new Error("no active club");
        await disconnectYoutube({ data: { clubId: activeClubId } });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: keys.youtubeConnection.all });
        queryClient.invalidateQueries({ queryKey: keys.clubStreams.all });
      },
    }),

    /** Returns the ingest URL and key once — the caller is what shows them,
     *  since neither is ever readable again after this call resolves. */
    createStream: useMutation({
      mutationFn: async ({
        tableId,
        label,
      }: {
        tableId: number;
        label: string;
      }) => {
        if (!activeClubId) throw new Error("no active club");
        return createClubStream({
          data: { clubId: activeClubId, tableId, label },
        });
      },
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: keys.clubStreams.all }),
    }),

    deleteStream: useMutation({
      mutationFn: async (streamId: number) => {
        if (!activeClubId) throw new Error("no active club");
        await deleteClubStream({ data: { clubId: activeClubId, streamId } });
      },
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: keys.clubStreams.all }),
    }),
  };
};
