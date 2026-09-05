// Not crypto.randomUUID directly: it is secure-context only, so it is missing
// on a tablet opening the app over plain http. See libs/algorithms/uuid.ts.
import { isPlaceholderPlayer } from "../placeholderPlayer";
import { uuid } from "@/libs/algorithms/uuid";
import { resolveBracket } from "./resolve";
import type { BracketSide, Category } from "@/types";

/**
 * Fixture generation. Pure — no React, no Supabase — so it can be checked
 * without either — see generate.test.ts.
 *
 * The one idea worth knowing: a match does not store who will play in it, only
 * where its winner and loser go next. Round-one seats (and every league or
 * group fixture) are filled at generation; everything upstream is derived by
 * `resolveBracket` at render time (see resolve.ts). Filing a result is
 * therefore a single UPDATE, and a bracket that is half-advanced cannot exist.
 *
 * Single and double elimination are the same function: a single-elimination
 * bracket is the double-elimination one without the losers half.
 */
export type PlannedMatch = {
  id: string;
  bracket: BracketSide;
  round: number;
  /** 0-based position within the round. */
  slot: number;
  group_no: number | null;
  p1_id: number | null;
  p2_id: number | null;
  winner_id: number | null;
  winner_to: string | null;
  winner_to_slot: number | null;
  loser_to: string | null;
  loser_to_slot: number | null;
};

const blank = (
  bracket: BracketSide,
  round: number,
  slot: number,
  id: string,
): PlannedMatch => ({
  id,
  bracket,
  round,
  slot,
  group_no: null,
  p1_id: null,
  p2_id: null,
  winner_id: null,
  winner_to: null,
  winner_to_slot: null,
  loser_to: null,
  loser_to_slot: null,
});

/** Top two from each group qualify, so the field halves into the bracket. */
export const groupCount = (advance: number) => Math.max(1, advance / 2);

/** How many players a format needs before it can be generated. */
export function minimumEntrants(
  format: "double_elim" | "league" | "group_knockout",
  advance: number | null,
): number {
  // Three per group is the smallest round robin worth calling a group.
  if (format === "group_knockout") return 3 * groupCount(advance ?? 2);
  return 2;
}

/**
 * Standard bracket seed order: 1 plays the lowest seed, and the two top seeds
 * can only meet in the final. Returns 1-based seeds in bracket position order.
 */
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const paired = order.length * 2;
    const next: number[] = [];
    for (const seed of order) {
      next.push(seed, paired + 1 - seed);
    }
    order = next;
  }
  return order;
}

const nextPowerOfTwo = (n: number) => {
  let size = 2;
  while (size < n) size *= 2;
  return size;
};

/**
 * A knockout bracket. `playerIds` must already be in seed order (strongest
 * first). The field is padded to a power of two with byes, which are advanced
 * for you — including byes that cascade into the losers bracket.
 *
 * `singleFrom` is how far the double elimination goes: the number of players
 * left when the two brackets merge into one single-elimination stage. 2 is the
 * grand final, which is a full double-elimination draw and the default; 16 is
 * the shape a lot of pool events actually run — two lives until the last 16,
 * one after it. Anything at or above the padded field size is single
 * elimination from the first ball, the same as `doubleElim: false`.
 */
export function buildKnockout(
  playerIds: number[],
  opts: { doubleElim: boolean; singleFrom?: number },
  newId: () => string = uuid,
): PlannedMatch[] {
  if (playerIds.length < 2) return [];

  const size = nextPowerOfTwo(playerIds.length);
  const rounds = Math.log2(size);
  const seats = seedOrder(size).map((seed) => playerIds[seed - 1] ?? null);

  // Two players is one match, and it is the final in either format.
  if (size === 2) {
    const only = blank("final", 1, 0, newId());
    only.p1_id = seats[0];
    only.p2_id = seats[1];
    return resolveBracket([only]);
  }

  /**
   * Where the merge happens, in players left. Rounded up to a power of two and
   * clamped to the field, so a cutoff bigger than the entry list is not an
   * error — it just means the whole draw is single elimination, which is what
   * "single elimination from the last 16" says about a field of twelve.
   */
  const merge = Math.min(
    Math.max(2, nextPowerOfTwo(opts.singleFrom ?? 2)),
    size,
  );
  const singleElim = !opts.doubleElim || merge >= size;

  // How many winners rounds are played before the merge. The two brackets each
  // arrive at it with size/2^cut survivors, and those are the merge/2 + merge/2
  // players the single-elimination stage is drawn for.
  const cut = singleElim ? rounds : rounds - Math.log2(merge) + 1;

  // --- winners bracket -----------------------------------------------------
  const wb: PlannedMatch[][] = [];
  for (let r = 1; r <= cut; r++) {
    const count = size / 2 ** r;
    wb.push(
      Array.from({ length: count }, (_, slot) =>
        blank("winners", r, slot, newId()),
      ),
    );
  }
  for (let slot = 0; slot < wb[0].length; slot++) {
    wb[0][slot].p1_id = seats[slot * 2];
    wb[0][slot].p2_id = seats[slot * 2 + 1];
  }
  for (let r = 0; r < cut - 1; r++) {
    wb[r].forEach((match, slot) => {
      match.winner_to = wb[r + 1][slot >> 1].id;
      match.winner_to_slot = (slot % 2) + 1;
    });
  }

  if (singleElim) {
    // The last winners round is a single match, and it is the final.
    wb[cut - 1][0].bracket = "final";
    return resolveBracket(wb.flat());
  }

  // --- losers bracket ------------------------------------------------------
  // 2·cut − 2 rounds, alternating: odd rounds pair losers-bracket survivors
  // against each other, even rounds feed in that round's winners-bracket
  // casualties. The last one is a drop-in round holding the players knocked out
  // of the final winners round, which is why nobody leaves on one loss before
  // the merge.
  const lbRounds = 2 * cut - 2;
  const lbSize = (i: number) => size / 2 ** (Math.ceil(i / 2) + 1);

  const lb: PlannedMatch[][] = [];
  for (let i = 1; i <= lbRounds; i++) {
    lb.push(
      Array.from({ length: lbSize(i) }, (_, slot) =>
        blank("losers", i, slot, newId()),
      ),
    );
  }

  // Winners round 1 losers pair up into losers round 1.
  wb[0].forEach((match, slot) => {
    match.loser_to = lb[0][slot >> 1].id;
    match.loser_to_slot = (slot % 2) + 1;
  });
  // ponytail: winners-bracket casualties drop straight down, same slot order.
  // A club bracket does not need the cross-over that stops early rematches;
  // reverse this round's order if it ever matters.
  for (let r = 2; r <= cut; r++) {
    const target = lb[2 * (r - 1) - 1];
    wb[r - 1].forEach((match, slot) => {
      match.loser_to = target[slot].id;
      match.loser_to_slot = 2;
    });
  }

  for (let i = 1; i < lbRounds; i++) {
    const from = lb[i - 1];
    const to = lb[i];
    // Same width means the next round is where winners-bracket players drop in:
    // survivors keep their slot and take seat 1, the casualty takes seat 2.
    // A narrowing round has no drop-ins, so survivors pair off against
    // each other instead.
    const dropInRound = from.length === to.length;
    from.forEach((match, slot) => {
      match.winner_to = dropInRound ? to[slot].id : to[slot >> 1].id;
      match.winner_to_slot = dropInRound ? 1 : (slot % 2) + 1;
    });
  }

  // --- the merged stage ----------------------------------------------------
  // One single-elimination draw of `merge` players: the winners-bracket
  // survivors in seat 1, the losers-bracket survivors in seat 2. Its rounds
  // carry on the winners numbering, because that is what they are from here —
  // one loss and you are out.
  //
  // ponytail: one final, no bracket reset — whoever came up through the losers
  // bracket has to win it once. To add the reset, emit a second `final` round
  // and show it only when the first one's winner arrived from `losers`.
  const stage: PlannedMatch[][] = [];
  for (let r = 1; r <= Math.log2(merge); r++) {
    const count = merge / 2 ** r;
    stage.push(
      Array.from({ length: count }, (_, slot) =>
        blank("winners", cut + r, slot, newId()),
      ),
    );
  }
  const last = stage[stage.length - 1][0];
  last.bracket = "final";

  const wbLast = wb[cut - 1];
  const lbLast = lb[lbRounds - 1];
  wbLast.forEach((match, slot) => {
    match.winner_to = stage[0][slot].id;
    match.winner_to_slot = 1;
  });
  // Reversed, so the player knocked out of a winners match does not meet that
  // same opponent again the moment they win their way back.
  lbLast.forEach((match, slot) => {
    match.winner_to = stage[0][lbLast.length - 1 - slot].id;
    match.winner_to_slot = 2;
  });

  for (let r = 0; r < stage.length - 1; r++) {
    stage[r].forEach((match, slot) => {
      match.winner_to = stage[r + 1][slot >> 1].id;
      match.winner_to_slot = (slot % 2) + 1;
    });
  }

  return resolveBracket([...wb.flat(), ...lb.flat(), ...stage.flat()]);
}

/**
 * Round robin by the circle method. An odd field gets a ghost, whose fixtures
 * are dropped — that player sits out the round. `legs: 2` replays the whole
 * fixture list with the sides swapped.
 */
export function buildLeague(
  playerIds: number[],
  legs: 1 | 2,
  newId: () => string = uuid,
  bracket: BracketSide = "league",
  groupNo: number | null = null,
): PlannedMatch[] {
  if (playerIds.length < 2) return [];

  const seats: (number | null)[] = [...playerIds];
  if (seats.length % 2) seats.push(null);
  const perRound = seats.length / 2;
  const roundsPerLeg = seats.length - 1;

  const out: PlannedMatch[] = [];
  for (let leg = 0; leg < legs; leg++) {
    const wheel = [...seats];
    for (let r = 0; r < roundsPerLeg; r++) {
      let slot = 0;
      for (let i = 0; i < perRound; i++) {
        const home = wheel[i];
        const away = wheel[wheel.length - 1 - i];
        if (home === null || away === null) continue;
        const match = blank(
          bracket,
          leg * roundsPerLeg + r + 1,
          slot++,
          newId(),
        );
        match.group_no = groupNo;
        // Sides swap in the second leg, which is all "home and away" means here.
        match.p1_id = leg === 0 ? home : away;
        match.p2_id = leg === 0 ? away : home;
        out.push(match);
      }
      // Pin the first seat, rotate the rest.
      wheel.splice(1, 0, wheel.pop()!);
    }
  }
  return out;
}

/**
 * Snake-seeds the field into `groups` round-robin groups, so the strongest
 * players end up spread across them rather than stacked in the first.
 * `playerIds` must be in seed order.
 */
export function buildGroups(
  playerIds: number[],
  groups: number,
  legs: 1 | 2,
  newId: () => string = uuid,
): PlannedMatch[] {
  const buckets: number[][] = Array.from({ length: groups }, () => []);
  playerIds.forEach((id, i) => {
    const row = Math.floor(i / groups);
    const within = i % groups;
    buckets[row % 2 === 0 ? within : groups - 1 - within].push(id);
  });

  return buckets.flatMap((bucket, index) =>
    buildLeague(bucket, legs, newId, "group", index + 1),
  );
}

const isId = (id: number | undefined): id is number => id !== undefined;

/**
 * The bracket's seed order after a group phase: every group winner, then every
 * runner-up, both in group order. buildKnockout pairs seed i with seed n+1−i,
 * so group g's winner (seed g) meets the runner-up of group n/2+1−g — never
 * their own. The exception is a single group, where the two qualifiers have to
 * meet because they are the whole field.
 */
export function qualifiers(
  groupStandings: { playerId: number }[][],
  advance: number,
): number[] {
  const winners = groupStandings.map((g) => g[0]?.playerId).filter(isId);
  const runnersUp = groupStandings.map((g) => g[1]?.playerId).filter(isId);
  return [...winners, ...runnersUp].slice(0, advance);
}

/** Players eligible for a tournament: everyone, or one division — and never the
 *  guest placeholder, which is one row standing for whoever walked in and so
 *  cannot be an entrant. See libs/algorithms/placeholderPlayer.ts. */
export const eligible = <T extends { category: Category; name: string }>(
  players: T[],
  category: Category | null,
) =>
  players.filter(
    (p) =>
      !isPlaceholderPlayer(p) && (category === null || p.category === category),
  );
