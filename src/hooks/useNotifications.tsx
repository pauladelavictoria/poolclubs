import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useGetChallenges } from "@/hooks/useChallenges";
import {
  useGetTournaments,
  useMyPendingMatches,
  useMyTournamentIds,
} from "@/hooks/useTournaments";
import { usePlayerLookup } from "@/hooks/useGetPlayers";
import { useT } from "@/i18n";

export type NotificationKind =
  | "challengeAccepted"
  | "challengeDeclined"
  | "tournamentOpen"
  | "tournamentAction";

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

function loadSeen(playerId: number): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + playerId);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveSeen(playerId: number, seen: Set<string>) {
  localStorage.setItem(STORAGE_PREFIX + playerId, JSON.stringify([...seen]));
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

  const [seen, setSeen] = useState<Set<string>>(() => new Set());

  // A different player (switching club, signing in) reads its own history.
  useEffect(() => {
    setSeen(player ? loadSeen(player.id) : new Set());
  }, [player?.id]);

  const items = useMemo<AppNotification[]>(() => {
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

    // Things waiting on you float to the top; everything else keeps arrival order.
    return list.sort((a, b) => Number(b.needsAction) - Number(a.needsAction));
  }, [player, pendingMatches, challenges, tournaments, myTournamentIds, t, nameOf]);

  const unreadCount = items.filter((i) => !seen.has(i.id)).length;

  const markAllSeen = useCallback(() => {
    if (!player || items.length === 0) return;
    setSeen((prev) => {
      const next = new Set(prev);
      for (const i of items) next.add(i.id);
      saveSeen(player.id, next);
      return next;
    });
  }, [player, items]);

  return { items, unreadCount, seen, markAllSeen };
};
