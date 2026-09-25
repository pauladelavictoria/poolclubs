import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { keys } from "@/libs/queryKeys";
import {
  getYoutubeConnection,
  disconnectYoutube,
  listClubStreams,
  createClubStream,
  deleteClubStream,
  getStreamedTableIds,
  getLiveBroadcasts,
  getGameRecording,
  revealClubStream,
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

/** Which tables have a camera — the "Record this game" checkbox (§2.5) only
 *  shows for one of these. Not admin-gated, unlike the two hooks above: any
 *  member starting a game needs this, not just the settings screen. */
export const useStreamedTableIds = () => {
  const { activeClubId } = useAuth();
  return useQuery({
    queryKey: keys.streamedTableIds.in(activeClubId),
    queryFn: () => getStreamedTableIds({ data: { clubId: activeClubId! } }),
    enabled: !!activeClubId,
  });
};

/** Broadcasts live now, keyed by live match id. Polled at the reconciler's
 *  own pace: it only moves a session to live once a minute. */
export const useLiveBroadcasts = () => {
  const { activeClubId } = useAuth();
  return useQuery({
    queryKey: keys.liveBroadcasts.in(activeClubId),
    queryFn: () => getLiveBroadcasts({ data: { clubId: activeClubId! } }),
    enabled: !!activeClubId,
    refetchInterval: 60_000,
  });
};

/** A filed game's YouTube broadcast id, or null. Not polled: a finished
 *  game's recording is there by the time anyone opens its page, or never. */
export const useGameRecording = (gameId: string) =>
  useQuery({
    queryKey: keys.gameRecording.of(gameId),
    queryFn: () => getGameRecording({ data: { gameId } }),
  });

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
        queryClient.invalidateQueries({ queryKey: keys.streamedTableIds.all });
      },
    }),

    /** Returns the ingest URL and key straight from creation, so the caller
     *  can show them without an extra round trip — `revealStream` below gets
     *  the same two values again any time after. */
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
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: keys.clubStreams.all });
        queryClient.invalidateQueries({ queryKey: keys.streamedTableIds.all });
      },
    }),

    deleteStream: useMutation({
      mutationFn: async (streamId: number) => {
        if (!activeClubId) throw new Error("no active club");
        await deleteClubStream({ data: { clubId: activeClubId, streamId } });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: keys.clubStreams.all });
        queryClient.invalidateQueries({ queryKey: keys.streamedTableIds.all });
      },
    }),

    /** The ingest URL and key again, on demand — decrypted server-side each
     *  call, never cached in query state, so closing the reveal and asking
     *  again is the same round trip as the first time. */
    revealStream: useMutation({
      mutationFn: async (streamId: number) => {
        if (!activeClubId) throw new Error("no active club");
        return revealClubStream({ data: { clubId: activeClubId, streamId } });
      },
    }),
  };
};
