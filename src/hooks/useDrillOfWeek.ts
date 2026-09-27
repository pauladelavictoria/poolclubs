import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/libs/supabase/browser";
import { useAuth } from "@/hooks/useAuth";
import { useDrills } from "@/hooks/useDrills";
import { drillOfWeek, weekKey, weekStart } from "@/libs/algorithms/drillOfWeek";

export type BoardRow = {
  player_id: number;
  player_name: string;
  avatar_url: string | null;
  best_score: number;
  max_score: number;
  attempts: number;
};

/** This week's drill for the active club, and when its week began. */
export const useDrillOfWeek = () => {
  const { activeClub } = useAuth();
  const { data: drills, isLoading } = useDrills();
  const now = new Date();
  return {
    drill: drills && drillOfWeek(activeClub, drills, now),
    since: weekStart(now).toISOString(),
    isLoading,
  };
};

/**
 * The club's best score per player this week. Keyed under drill_logs, so the realtime
 * listener that already invalidates logs (libs/browser/realtime.ts) keeps every
 * board live — a score saved on a tablet lands on the lobby with no extra wire.
 */
export const useDrillBoard = (drillId: number | undefined, since: string) => {
  const { activeClubId } = useAuth();
  return useQuery({
    queryKey: ["drill_logs", "week", drillId, since, activeClubId],
    enabled: !!drillId,
    queryFn: async () => {
      const { data } = await supabase
        .rpc("drill_week_board", {
          p_drill_id: drillId!,
          p_since: since,
          p_club_id: activeClubId,
        })
        .throwOnError();
      return (data ?? []) as BoardRow[];
    },
  });
};

/** A club admin swaps the week's drill for their club. Lapses on Monday. */
export const useSetDrillOfWeek = () => {
  const { activeClubId, refreshMemberships } = useAuth();
  return useMutation({
    mutationFn: async (drillId: number | null) => {
      await supabase
        .from("clubs")
        .update({
          drill_override_id: drillId,
          drill_override_week: drillId ? weekKey(new Date()) : null,
        })
        .eq("id", activeClubId)
        .throwOnError();
    },
    // The override rides on activeClub, which comes off the session.
    onSuccess: () => refreshMemberships(),
  });
};
