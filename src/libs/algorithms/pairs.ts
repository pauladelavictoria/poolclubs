import type { Category } from "@/types";

/**
 * Couples tournaments. A pair is one entry: the player who entered, plus the
 * partner they named — so everything keyed on an entrant id (fixtures,
 * standings, the winner) stays the captain's id, and the partner only shows up
 * in names and in the doubles game a result files.
 */

/**
 * Whether two players may pair up. UI mirror of tournament_player_pair_guard
 * in sql/schema.sql — change both together.
 *
 * `minSum` is the least the two categories may add up to (1 is the strongest),
 * so 4 lets a 1 pair only with a 3, and two 2s pair. No minimum: anybody.
 */
export function canPair(
  minSum: number | null,
  a: Category,
  b: Category,
): boolean {
  return minSum === null || a + b >= minSum;
}

/**
 * The pair rules worth offering for a tournament's categories (null = all):
 * each minimum sum that rules out some pairs but still leaves more than one
 * kind, with the pairs it rules out. A minimum that changes nothing, or leaves
 * a single kind of pair (only two 3rds — that is a 3rd-category tournament),
 * is not a rule anyone needs. Two minimums ruling out the same pairs are one.
 */
export function pairRules(categories: Category[] | null) {
  const cats: Category[] = categories ?? [1, 2, 3];
  const pairs = cats.flatMap((a) =>
    cats.filter((b) => b >= a).map((b) => [a, b] as const),
  );
  const rules: {
    minSum: number;
    forbidden: (readonly [Category, Category])[];
  }[] = [];
  for (let minSum = 3; minSum <= 6; minSum++) {
    const forbidden = pairs.filter(([a, b]) => a + b < minSum);
    const allowed = pairs.length - forbidden.length;
    if (forbidden.length === 0 || allowed < 2) continue;
    if (rules.at(-1)?.forbidden.length === forbidden.length) continue;
    rules.push({ minSum, forbidden });
  }
  return rules;
}

/** Each captain's partner, off the entrant rows. */
export const partnersOf = (
  entries: { player_id: number; partner_id?: number | null }[],
) =>
  new Map(
    entries.flatMap((e) =>
      e.partner_id ? [[e.player_id, e.partner_id] as const] : [],
    ),
  );

/** An entrant's name: the player's alone, or "Ana / Luis" for a pair. */
export const pairNameOf =
  (partners: Map<number, number>, nameOf: (id: number) => string) =>
  (id: number) => {
    const partner = partners.get(id);
    return partner ? `${nameOf(id)} / ${nameOf(partner)}` : nameOf(id);
  };
