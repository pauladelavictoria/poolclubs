import { useCallback, useEffect, useMemo, useState } from "react";
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
  to: string;
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

  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  // A different player (switching club, signing in) reads its own history.
  useEffect(() => {
    setSeen(player ? loadIds(STORAGE_PREFIX, player.id) : new Set());
    setDismissed(player ? loadIds(DISMISSED_PREFIX, player.id) : new Set());
  }, [player?.id]);

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
        to: `/app/tournaments/${match.tournament_id}`,
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
          to: "/app/challenges",
        });
        continue;
      }

      if (c.from_player_id !== player.id) continue;
      if (c.status !== "accepted" && c.status !== "declined") continue;

      list.push({
        id: `challenge:${c.id}:${c.status}`,
        kind: c.status === "accepted" ? "challengeAccepted" : "challengeDeclined",
        needsAction: false,
        message: t(
          c.status === "accepted"
            ? "notifications.challengeAccepted"
            : "notifications.challengeDeclined",
          { name: nameOf(c.to_player_id) },
        ),
        to: "/app/challenges",
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
        to: `/app/tournaments/${tour.id}`,
      });
    }

    const triedDrillIds = new Set((myDrillLogs ?? []).map((log) => log.drill_id));
    for (const drill of drills ?? []) {
      if (triedDrillIds.has(drill.id)) continue;

      list.push({
        id: `drill-added:${drill.id}`,
        kind: "drillAdded",
        needsAction: false,
        message: t("notifications.drillAdded", { name: drill.name }),
        to: `/app/drills/${drill.id}`,
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
    setSeen((prev) => {
      const next = new Set(prev);
      for (const i of items) next.add(i.id);
      saveIds(STORAGE_PREFIX, player.id, next);
      return next;
    });
  }, [player, items]);

  const clearAll = useCallback(() => {
    if (!player || items.length === 0) return;
    setDismissed((prev) => {
      const next = new Set(prev);
      for (const i of items) next.add(i.id);
      saveIds(DISMISSED_PREFIX, player.id, next);
      return next;
    });
  }, [player, items]);

  return { items, unreadCount, seen, markAllSeen, clearAll };
};
