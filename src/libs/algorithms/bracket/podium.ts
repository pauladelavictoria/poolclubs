import type { MatchLike } from "./resolve";
import type { BracketSide } from "@/types";

type Races = {
  race_to: number;
  race_semi: number | null;
  race_final: number | null;
};

/**
 * How many racks a match is played to.
 *
 * Stored by stage rather than by round number, because a round number means
 * nothing until the field size is known — you cannot say "round 3 is a race to
 * 7" before you know whether there will be three rounds or five. "The final" is
 * decidable the day entries open, which is when an organiser wants to decide it.
 *
 * The semi-final race covers the last round of each half of the draw: in a
 * double-elimination bracket that is both the winners final and the losers
 * final, which are the two matches that put someone into the grand final.
 * A league or a group has no closing stage, so everything is the base race.
 */
export function raceFor<T extends { bracket: BracketSide; round: number }>(
  match: T,
  races: Races,
  all: T[],
): number {
  if (match.bracket === "final") return races.race_final ?? races.race_to;
  if (match.bracket !== "winners" && match.bracket !== "losers") {
    return races.race_to;
  }

  const lastRound = Math.max(
    ...all.filter((m) => m.bracket === match.bracket).map((m) => m.round),
  );
  // In a single-elimination draw the last winners round IS the final, and it is
  // already labelled that way, so this only ever catches a genuine semi.
  return match.round === lastRound
    ? (races.race_semi ?? races.race_to)
    : races.race_to;
}

export type Places = {
  first: number | null;
  second: number | null;
  /** Two players share third whenever nothing was played to separate them. */
  third: number[];
};

/**
 * Who finished where, read off the match graph rather than off a table: in a
 * knockout the podium is a matter of who lost to whom, not of who won most.
 *
 * Third place is decided by what feeds the final, which is the one question all
 * three shapes answer differently. A full double-elimination draw sends the
 * losers final into it, and that match has already played third place off. A
 * single-elimination draw — and the single-elimination stage a hybrid ends with
 * — sends two semi-finals into it, and those two beaten semi-finalists never
 * meet, so they share the step.
 */
export function placings<
  T extends MatchLike & { bracket: BracketSide; round: number },
>(matches: T[]): Places {
  const final = matches.find(
    (m) => m.bracket === "final" && m.winner_id !== null,
  );
  if (!final) return { first: null, second: null, third: [] };

  const loserOf = (m: T) => (m.p1_id === m.winner_id ? m.p2_id : m.p1_id);
  const notNull = (id: number | null): id is number => id !== null;

  const feeders = matches.filter(
    (m) => m.winner_to === final.id && m.winner_id !== null,
  );
  const fromLosers = feeders.filter((m) => m.bracket === "losers");

  // Whoever lost the losers final is third. Where nothing arrives from that
  // side, both semi-finals do, and both of their losers are.
  const beaten = fromLosers.length ? fromLosers : feeders;

  return {
    first: final.winner_id,
    second: loserOf(final),
    third: beaten.map(loserOf).filter(notNull),
  };
}
