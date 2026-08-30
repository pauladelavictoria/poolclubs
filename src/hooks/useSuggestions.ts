import { useMemo } from "react";
import { useGames } from "@/hooks/useGames";
import { usePlayers } from "@/hooks/usePlayers";
import { useClubTables } from "@/hooks/useClubTables";
import { useLiveMatches } from "@/hooks/useLiveMatch";
import { useAuth } from "@/hooks/useAuth";
import { useWhoIsHere } from "@/hooks/useNight";
import { seatsOf } from "@/libs/algorithms/night";
import { dayKeyOf, zoneOf } from "@/libs/algorithms/day";
import { useNow } from "@/hooks/useNow";
import {
  balanceDoubles,
  pairKey,
  seatsNeeded,
  suggestGroups,
  type DaySetup,
} from "@/libs/algorithms/today";
import type { ClubTable, Player } from "@/types";

/**
 * Who could play whom, right now.
 *
 * A hook rather than forty lines in a page, because two screens need the same
 * answer and they must not be able to disagree about it: /today offers the
 * night's matches, and the scoreboard offers the next one the moment a result
 * is filed. Two implementations of "whose turn is it" is one of them being
 * wrong in front of the room.
 *
 * Everything it reads is already in the cache — the roster, the tables, the live
 * rows, today's results — so this costs no request of its own.
 */
/** The default for `exclude`, hoisted so it is the same array every render: an
 *  `= []` in the destructure is a new one each time, and the memo below has it
 *  as a dependency. */
const NO_SEATS: number[] = [];

/** Likewise, so a disabled caller gets the same empty array every render rather
 *  than a new one out of the memo. */
const NO_GROUPS: Player[][] = [];

export function useSuggestions({
  setup,
  maxGroups,
  exclude = NO_SEATS,
  enabled = true,
}: {
  /** What the club is playing. The page owns it, because the page can change
   *  it; see libs/algorithms/today.ts. */
  setup: DaySetup;
  /** How many matches are wanted — the free tables, in practice. */
  maxGroups: number;
  /** Kept out of it. The pair who have just this second finished, when the
   *  question is who gets their table next: the row is already deleted, so they
   *  read as idle with the game they just played not yet counted — and they have
   *  had the table either way. */
  exclude?: number[];
  /** ponytail: for a caller that only wants an answer sometimes.
   *
   *  The scoreboard is the case. It needs a suggestion once, when a result has
   *  just been filed and its table is free — but the hook sits at the top of the
   *  component, so it was recomputing the night's whole pairing history on every
   *  score tap and throwing it away. Cheaper than splitting the page in two. */
  enabled?: boolean;
}): {
  groups: Player[][];
  freeTables: ClubTable[];
  /** Whether the signed-in player may start this one. Mirrors
   *  can_score_live_match in sql/schema.sql. */
  canStart: (group: Player[]) => boolean;
} {
  const { player, isClubAdmin, activeClub } = useAuth();
  const { data: tables } = useClubTables();
  const { data: live } = useLiveMatches();
  const here = useWhoIsHere();

  // The club's night in the club's own zone, which is neither the calendar's
  // day nor the visitor's — see libs/algorithms/day.ts.
  const now = useNow();
  const tz = zoneOf(activeClub);
  const today = now === null ? null : dayKeyOf(now, tz);
  // Not until the day is known. Without a date this query is the club's entire
  // game history — see the note on useGames' `enabled`.
  //
  // Gated on the day and not on `enabled`: a disabled caller still wants this
  // warm. The scoreboard asks for a suggestion the instant a result is filed,
  // and a query that started fetching at that moment would hand it an empty
  // list — which that page reads as "nobody waiting" and navigates away on.
  const { data: gamesToday } = useGames(
    { date: today ?? undefined, tz },
    { enabled: today !== null },
  );
  // Only so the roster is warm for whoever renders the names; `here` is already
  // derived from it.
  usePlayers();

  const seats = seatsNeeded(setup);

  const freeTables = useMemo(() => {
    const matchOn = (tableId: number) =>
      (live ?? []).find((m) => m.table_id === tableId);
    return (tables ?? []).filter((tbl) => !matchOn(tbl.id));
  }, [tables, live]);

  /**
   * The night's pairing, rebuilt only when something it reads has moved.
   *
   * Memoised because of where it is called from: the scoreboard subscribes to
   * the club's live list, and every score tap writes that key twice — once
   * optimistically and once when the socket echoes the row back. Unwrapped, a
   * tap rebuilt the map, the set, the sorted queue and the groups, three times
   * over, for an answer that screen only reads between matches.
   *
   * `setup` is not a dependency: readTodaySetup() decodes a fresh object every
   * render, so it never compares equal. `seats` is what this actually uses.
   */
  const groups = useMemo(() => {
    if (!enabled) return NO_GROUPS;

    // All four seats, so a doubles partner is not offered a table of their own.
    const busy = new Set((live ?? []).flatMap(seatsOf));

    // Tonight's results, twice over: how many games each person has had, and
    // who has already been on a table with whom. The first orders the waiting
    // list, the second keeps it from pairing the same two again.
    const playedToday = new Map<number, number>();
    const metToday = new Set<string>();

    for (const game of gamesToday?.games ?? []) {
      const ids = [
        game.player_1_id,
        game.player_2_id,
        game.player_1b_id,
        game.player_2b_id,
      ].filter((id): id is number => id !== null);

      for (const id of ids) playedToday.set(id, (playedToday.get(id) ?? 0) + 1);
      // Partners as well as opponents: they have had their game together either
      // way, and in doubles a repeated partner is as stale as a repeated one.
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++)
          metToday.add(pairKey(ids[i], ids[j]));
    }

    /**
     * Here, and not at a table.
     *
     * Fewest games tonight first, then longest checked in. Whoever has been
     * sitting with a drink all evening is the answer to "who should have this
     * table", and the person who has just filed their third is not — but it is
     * a sort and not a filter: by ten o'clock everybody has played, and a
     * suggestion nobody is offered is worse than one that repeats a pairing.
     *
     * Arriving is the whole of the queue this replaced, which is the point: it
     * is the one thing everybody does anyway.
     *
     * The club's own tablet checks in as a device and is not a player, so it
     * never turns up in a suggestion.
     */
    const skip = new Set(exclude);
    const idle = here
      .filter((p) => !busy.has(p.id) && !skip.has(p.id) && p.is_device !== true)
      // A copy: filter already made one, but saying so keeps the sort off
      // whatever `here` is memoised from.
      .sort(
        (a, b) =>
          (playedToday.get(a.id) ?? 0) - (playedToday.get(b.id) ?? 0) ||
          (a.present_since ?? "").localeCompare(b.present_since ?? ""),
      );

    // The queue decides which people are together; the divisions decide who
    // plays with whom. Balanced as the groups are formed, so the names shown
    // and the match started are the same match.
    return suggestGroups(
      idle,
      seats,
      (a, b) => metToday.has(pairKey(a, b)),
      maxGroups,
    ).map((group) => (seats === 4 ? balanceDoubles(group) : group));
  }, [enabled, live, gamesToday, here, exclude, seats, maxGroups]);

  const canStart = (group: Player[]) =>
    isClubAdmin ||
    player?.is_device === true ||
    group.some((p) => p.id === player?.id);

  return { groups, freeTables, canStart };
}

/** The seats a suggested group fills, in the order the row wants them. */
export const seatsOfGroup = (group: Player[], seats: number) => ({
  player1: group[0],
  partner1: seats === 4 ? group[1] : null,
  player2: seats === 4 ? group[2] : group[1],
  partner2: seats === 4 ? group[3] : null,
});
