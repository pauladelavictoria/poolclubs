import { useCallback, useEffect, useMemo, useState } from "react";
import type { CrumbLink } from "@/libs/routeMeta";
import { useAuth } from "@/hooks/useAuth";
import { useGetChallenges } from "@/hooks/useChallenges";
import {
  useGetTournaments,
  useMyPendingMatches,
  useMyTournamentIds,
} from "@/hooks/useTournaments";
import { useGetDrills } from "@/hooks/useGetDrills";
import { useGetDrillLogs } from "@/hooks/useGetDrillLogs";
import { usePlayerLookup } from "@/hooks/useGetPlayers";
import { useT } from "@/i18n";

export type NotificationKind =
  | "challengeReceived"
  | "challengeAccepted"
  | "challengeDeclined"
  | "tournamentOpen"
  | "tournamentAction"
  | "drillAdded";

export type AppNotification = {
  /** Stable and unique per underlying event *and* its current state, so an
   *  already-seen row reappears the moment the thing it describes changes
   *  again (a challenge accepted, then later played, is two different ids). */
  id: string;
  kind: NotificationKind;
  /** Something is waiting on you, not just informing you. */
  needsAction: boolean;
  message: string;
  /** Where tapping it goes: a route pattern plus its parameters, so the bell's
   *  links are checked like every other link in the app. */
  link: CrumbLink;
};

const STORAGE_PREFIX = "notifications-seen:";
const DISMISSED_PREFIX = "notifications-dismissed:";

function loadIds(prefix: string, playerId: number): Set<string> {
  try {
    const raw = localStorage.getItem(prefix + playerId);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveIds(prefix: string, playerId: number, ids: Set<string>) {
  localStorage.setItem(prefix + playerId, JSON.stringify([...ids]));
}

/** Both sets plus the player they belong to, so a switch is one comparison. */
function loadHistory(playerId: number | undefined) {
  return {
    playerId,
    seen: playerId ? loadIds(STORAGE_PREFIX, playerId) : new Set<string>(),
    dismissed: playerId
      ? loadIds(DISMISSED_PREFIX, playerId)
      : new Set<string>(),
  };
}

/** Nothing read yet — what the server renders, since it has no localStorage. */
const emptyHistory = (playerId: number | undefined) => ({
  playerId,
  seen: new Set<string>(),
  dismissed: new Set<string>(),
});

/**
 * A notification feed derived entirely from data the app already fetches —
 * there is no notifications table. "Unread" is tracked client-side, keyed by
 * a composite id per event *and* its current state: once you've seen a
 * challenge marked accepted, that id is done, but if it later moves to
 * played it's a new id and shows up again.
 */
export const useNotifications = () => {
  const { player } = useAuth();
  const { t } = useT();
  const { nameOf } = usePlayerLookup();
  const { data: challenges } = useGetChallenges();
  const { data: tournaments } = useGetTournaments();
  const { data: myTournamentIds } = useMyTournamentIds();
  const { data: pendingMatches } = useMyPendingMatches();
  const { data: drills } = useGetDrills();
  const { data: myDrillLogs } = useGetDrillLogs({ player_id: player?.id });

  // Which notifications have been read is per-device UI state in localStorage,
  // which the server cannot read — so the first render is "nothing read yet" on
  // both sides and the real sets arrive just after hydration. Reading storage
  // during render, as this used to, renders different HTML on the server than
  // the client and React throws the whole tree away.
  const [history, setHistory] = useState(() => emptyHistory(player?.id));

  useEffect(() => {
    // A deliberate post-hydration correction, not a cascade: the server rendered
    // "nothing read yet" because it cannot see localStorage, and this is the
    // first moment the real sets are readable. One extra render, once per player.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(loadHistory(player?.id));
  }, [player?.id]);

  const { seen, dismissed } = history;

  const allItems = useMemo<AppNotification[]>(() => {
    if (!player) return [];

    const list: AppNotification[] = [];

    for (const match of pendingMatches ?? []) {
      list.push({
        id: `tournament-action:${match.id}`,
        kind: "tournamentAction",
        needsAction: true,
        message: t("notifications.tournamentAction", {
          name: match.tournament.name,
        }),
        link: {
          to: "/app/$clubSlug/tournaments/$tournamentId",
          params: { tournamentId: String(match.tournament_id) },
        },
      });
    }

    for (const c of challenges ?? []) {
      if (c.to_player_id === player.id && c.status === "pending") {
        list.push({
          id: `challenge:${c.id}:${c.status}`,
          kind: "challengeReceived",
          needsAction: true,
          message: t("notifications.challengeReceived", {
            name: nameOf(c.from_player_id),
          }),
          link: { to: "/app/$clubSlug/challenges" },
        });
        continue;
      }

      if (c.from_player_id !== player.id) continue;
      if (c.status !== "accepted" && c.status !== "declined") continue;

      list.push({
        id: `challenge:${c.id}:${c.status}`,
        kind:
          c.status === "accepted" ? "challengeAccepted" : "challengeDeclined",
        needsAction: false,
        message: t(
          c.status === "accepted"
            ? "notifications.challengeAccepted"
            : "notifications.challengeDeclined",
          { name: nameOf(c.to_player_id) },
        ),
        link: { to: "/app/$clubSlug/challenges" },
      });
    }

    for (const tour of tournaments ?? []) {
      if (tour.status !== "open") continue;
      if (tour.category !== null && tour.category !== player.category) continue;
      if (myTournamentIds?.has(tour.id)) continue;

      list.push({
        id: `tournament-open:${tour.id}`,
        kind: "tournamentOpen",
        needsAction: false,
        message: t("notifications.tournamentOpen", { name: tour.name }),
        link: {
          to: "/app/$clubSlug/tournaments/$tournamentId",
          params: { tournamentId: String(tour.id) },
        },
      });
    }

    const triedDrillIds = new Set(
      (myDrillLogs ?? []).map((log) => log.drill_id),
    );
    for (const drill of drills ?? []) {
      if (triedDrillIds.has(drill.id)) continue;

      list.push({
        id: `drill-added:${drill.id}`,
        kind: "drillAdded",
        needsAction: false,
        message: t("notifications.drillAdded", { name: drill.name }),
        link: {
          to: "/app/$clubSlug/drills/$drillId",
          params: { drillId: String(drill.id) },
        },
      });
    }

    // Things waiting on you float to the top; everything else keeps arrival order.
    return list.sort((a, b) => Number(b.needsAction) - Number(a.needsAction));
  }, [
    player,
    pendingMatches,
    challenges,
    tournaments,
    myTournamentIds,
    drills,
    myDrillLogs,
    t,
    nameOf,
  ]);

  // Cleared items stay hidden until the thing they describe changes again —
  // its id changes with it (see AppNotification.id), so it comes back as new.
  const items = useMemo(
    () => allItems.filter((i) => !dismissed.has(i.id)),
    [allItems, dismissed],
  );

  const unreadCount = items.filter((i) => !seen.has(i.id)).length;

  const markAllSeen = useCallback(() => {
    if (!player || items.length === 0) return;
    setHistory((prev) => {
      const next = new Set(prev.seen);
      for (const i of items) next.add(i.id);
      saveIds(STORAGE_PREFIX, player.id, next);
      return { ...prev, seen: next };
    });
  }, [player, items]);

  const clearAll = useCallback(() => {
    if (!player || items.length === 0) return;
    setHistory((prev) => {
      const next = new Set(prev.dismissed);
      for (const i of items) next.add(i.id);
      saveIds(DISMISSED_PREFIX, player.id, next);
      return { ...prev, dismissed: next };
    });
  }, [player, items]);

  return { items, unreadCount, seen, markAllSeen, clearAll };
};
