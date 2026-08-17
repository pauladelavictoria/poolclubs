import type { Crumb } from "@/libs/routeMeta";

/**
 * Everything under a player is two levels deep. The middle crumb is named by
 * the player, so those pages hand PageTitle the real name — this is the trail
 * the app bar's back chevron uses and the fallback label if data is still on
 * its way.
 */
export const PLAYER_CRUMBS: Crumb[] = [
  { labelKey: "players.title", to: "/app/$clubSlug/players" },
  {
    labelKey: "players.detailTitle",
    to: "/app/$clubSlug/players/$playerId",
  },
];
