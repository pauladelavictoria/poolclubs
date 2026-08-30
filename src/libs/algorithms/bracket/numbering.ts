import type { MatchLike } from "./resolve";
import type { BracketSide } from "@/types";

/** Reading order of a tournament: groups, then the main draw, then the
 *  repêchage it feeds, then the match everything has been building to. */
const SIDE_ORDER: BracketSide[] = [
  "group",
  "league",
  "winners",
  "losers",
  "final",
];

type SeatSource = { number: number; kind: "winner" | "loser" };

export type BracketIndex = {
  /** The number this match is known by, the same in every view. */
  number: (matchId: string) => number | undefined;
  /** Which match will fill an empty seat, and with its winner or its loser. */
  source: (matchId: string, slot: 1 | 2) => SeatSource | undefined;
};

type Indexable = MatchLike & {
  bracket: BracketSide;
  round: number;
  slot: number;
  group_no: number | null;
};

/**
 * Numbers every match once, and works out where each empty seat's occupant is
 * coming from — so a gap can say "loser of #7" instead of shrugging.
 *
 * Built from the whole tournament in one place, because a match that is #12 in
 * the bracket has to be #12 in the list as well or the number is worse than no
 * number at all.
 */
export function bracketIndex<T extends Indexable>(matches: T[]): BracketIndex {
  const sorted = [...matches].sort(
    (a, b) =>
      SIDE_ORDER.indexOf(a.bracket) - SIDE_ORDER.indexOf(b.bracket) ||
      a.round - b.round ||
      (a.group_no ?? 0) - (b.group_no ?? 0) ||
      a.slot - b.slot,
  );

  const numbers = new Map(sorted.map((m, i) => [m.id, i + 1]));
  const seats = new Map<string, SeatSource>();

  for (const match of sorted) {
    const number = numbers.get(match.id)!;
    if (match.winner_to && match.winner_to_slot) {
      seats.set(`${match.winner_to}:${match.winner_to_slot}`, {
        number,
        kind: "winner",
      });
    }
    // A walkover has no loser to send anywhere, so that seat is not waiting on
    // it — promising one would be a lie the bracket never makes good on.
    const walkover =
      match.winner_id !== null &&
      (match.p1_id === null || match.p2_id === null);
    if (match.loser_to && match.loser_to_slot && !walkover) {
      seats.set(`${match.loser_to}:${match.loser_to_slot}`, {
        number,
        kind: "loser",
      });
    }
  }

  return {
    number: (matchId) => numbers.get(matchId),
    source: (matchId, slot) => seats.get(`${matchId}:${slot}`),
  };
}
