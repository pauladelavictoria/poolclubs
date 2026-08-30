import type { LiveMatch, Player } from "@/types";

/**
 * The club night's rules, as plain functions.
 *
 * Everything here is derived from a row and a clock, so it can be checked
 * without a renderer or a database — see night.test.ts.
 */

/**
 * How long a live match survives with nobody touching it.
 *
 * The same three hours are written into the "Members can clear an abandoned
 * match" policy in sql/live-night.sql. This constant is the single source for
 * both client copies of the rule — the list filter and the badge — and the
 * policy has a comment pointing back here. Drift and a row disappears from the
 * list while still refusing to be deleted.
 */
export const ABANDON_AFTER_MS = 3 * 60 * 60 * 1000;

/** A check-in lasts an evening, not a day. Nobody is still at the club eight
 *  hours after they said they were. */
export const PRESENT_WINDOW_MS = 8 * 60 * 60 * 1000;

export const isPresent = (player: Player, now: number) =>
  player.present_since !== null &&
  now - new Date(player.present_since).getTime() < PRESENT_WINDOW_MS;

export const isAbandoned = (match: LiveMatch, now: number) =>
  now - new Date(match.updated_at).getTime() >= ABANDON_AFTER_MS;

/**
 * The players on one side, one id for singles and two for doubles.
 *
 * Worth having as a function rather than reading the columns at each call site:
 * everything that asks "is this person playing" was written when a match had
 * two seats, and every one of those places is wrong for doubles in a way
 * nothing would notice — a partner who is at a table would still be counted as
 * waiting at one.
 */
export const seatsOfSide = (match: LiveMatch, side: 1 | 2): number[] =>
  side === 1
    ? [match.player_1_id, match.player_1b_id].filter(
        (id): id is number => id !== null,
      )
    : [match.player_2_id, match.player_2b_id].filter(
        (id): id is number => id !== null,
      );

/** Who a side is, as one string: a name, or a pair joined. Every list that
 *  summarises a live match needs this, and each of them writing its own is how
 *  a doubles match ends up shown as one player in three places. */
export const sideNames = (
  match: LiveMatch,
  side: 1 | 2,
  roster: Player[],
): string =>
  seatsOfSide(match, side)
    .map((id) => roster.find((p) => p.id === id)?.name ?? "—")
    .join(" & ");

/** Everyone at this table. */
export const seatsOf = (match: LiveMatch): number[] => [
  ...seatsOfSide(match, 1),
  ...seatsOfSide(match, 2),
];

/** 1 or 2 — which side is ahead, or null while it is level. */
export const leaderOf = (match: LiveMatch): 1 | 2 | null => {
  if (match.player_1_score > match.player_2_score) return 1;
  if (match.player_2_score > match.player_1_score) return 2;
  return null;
};

/** The race is won by getting there, so this is `>=` and not a comparison
 *  between the two scores: a match at 5-4 in a race to 5 is over. */
export const isMatchOver = (match: LiveMatch) =>
  Math.max(match.player_1_score, match.player_2_score) >= match.race_to;

/** The patch the plus button writes. A rack past the race is refused rather
 *  than clamped — the finish sheet is already up, and a button behind it should
 *  do nothing at all. */
export function bump(match: LiveMatch, side: 1 | 2) {
  if (isMatchOver(match)) return null;
  return {
    player_1_score: match.player_1_score + (side === 1 ? 1 : 0),
    player_2_score: match.player_2_score + (side === 2 ? 1 : 0),
    last_side: side,
  };
}

/**
 * The patch the minus button writes: one rack off that side.
 *
 * Deliberately allowed when the match is over — this is the only way back from
 * the mis-tap that reached the race, and the finish sheet's "keep playing" is
 * this on whichever side got there.
 *
 * `last_side` is cleared, because a corrected score has no last rack: the row
 * remembers who scored, not a history, and pretending otherwise would let the
 * next correction take a rack off the wrong player.
 */
export function unbump(match: LiveMatch, side: 1 | 2) {
  const score = side === 1 ? match.player_1_score : match.player_2_score;
  if (score <= 0) return null;
  return {
    player_1_score: match.player_1_score - (side === 1 ? 1 : 0),
    player_2_score: match.player_2_score - (side === 2 ? 1 : 0),
    last_side: null,
  };
}
