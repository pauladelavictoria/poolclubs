import { expect } from "vitest";
import { resolveBracket } from "./resolve";
import type { PlannedMatch } from "./generate";

/** Deterministic ids, so a failure names the same match twice running. */
export const ids = () => {
  let n = 0;
  return () => `m${++n}`;
};

export const field = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

export const of = (ms: PlannedMatch[], bracket: string) =>
  ms.filter((m) => m.bracket === bracket);

/**
 * Files a result for every match that has two players, re-deriving the
 * bracket after each one, until nothing is playable. `pick` decides who
 * wins; the default is the better seed.
 */
export function playOut(
  matches: PlannedMatch[],
  pick: (a: number, b: number) => number = Math.min,
) {
  let current = resolveBracket(matches);
  let guard = matches.length * 4;
  for (;;) {
    const next = current.find(
      (m) => m.winner_id === null && m.p1_id !== null && m.p2_id !== null,
    );
    if (!next) break;
    next.winner_id = pick(next.p1_id!, next.p2_id!);
    current = resolveBracket(current);
    expect(--guard, "playthrough did not converge").toBeGreaterThan(0);
  }
  return current;
}
