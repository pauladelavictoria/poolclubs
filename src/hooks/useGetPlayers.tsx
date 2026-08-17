import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { playersQuery } from "@/queries/players";

// The club comes from the URL, not from the caller: every call site means "the
// club I am looking at", so threading it through as an argument would only give
// them a chance to get it wrong. useAuth reads it off the route.
//
// The query itself lives in src/queries/players.ts so the route loader can prime
// the same key before this ever runs.
export const useGetPlayers = () => {
  const { activeClubId } = useAuth();
  return useQuery(playersQuery(activeClubId));
};

export const usePlayerLookup = () => {
  const { data } = useGetPlayers();

  return useMemo(() => {
    const byId = new Map((data ?? []).map((player) => [player.id, player]));
    return {
      byId,
      /** The em dash is what a list shows for someone since removed. */
      nameOf: (id: number) => byId.get(id)?.name ?? "—",
    };
  }, [data]);
};
