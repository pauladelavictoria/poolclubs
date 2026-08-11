/**
 * Fixture generation. Pure — no React, no Supabase — so it can be checked with
 * `node src/libs/bracket.check.ts`.
 *
 * The one idea worth knowing: a match does not store who will play in it, only
 * where its winner and loser go next. Round-one seats (and every league or
 * group fixture) are filled at generation; everything upstream is derived by
 * `resolveBracket` at render time. Filing a result is therefore a single
 * UPDATE, and a bracket that is half-advanced cannot exist.
 *
 * Single and double elimination are the same function: a single-elimination
 * bracket is the double-elimination one without the losers half.
 */
import type { BracketSide, Category } from "@/types";

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

/** The fields advancement needs. Both PlannedMatch and a stored row satisfy it. */
export type MatchLike = {
  id: string;
  p1_id: number | null;
  p2_id: number | null;
  winner_id: number | null;
  winner_to: string | null;
  winner_to_slot: number | null;
  loser_to: string | null;
  loser_to_slot: number | null;
};

const uuid = () => crypto.randomUUID();

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

/** How many players a format needs before it can be generated. */
export function minimumEntrants(
  format: "double_elim" | "league" | "group_knockout",
  advance: number | null,
): number {
  // Three per group is the smallest round robin worth calling a group.
  if (format === "group_knockout") return 3 * groupCount(advance ?? 2);
  return 2;
}

/** Top two from each group qualify, so the field halves into the bracket. */
export const groupCount = (advance: number) => Math.max(1, advance / 2);

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
 */
export function buildKnockout(
  playerIds: number[],
  opts: { doubleElim: boolean },
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

  // --- winners bracket -----------------------------------------------------
  const wb: PlannedMatch[][] = [];
  for (let r = 1; r <= rounds; r++) {
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
  for (let r = 0; r < rounds - 1; r++) {
    wb[r].forEach((match, slot) => {
      match.winner_to = wb[r + 1][slot >> 1].id;
      match.winner_to_slot = (slot % 2) + 1;
    });
  }

  if (!opts.doubleElim) {
    // The last winners round is a single match, and it is the final.
    wb[rounds - 1][0].bracket = "final";
    return resolveBracket(wb.flat());
  }

  // --- losers bracket ------------------------------------------------------
  // 2·rounds − 2 rounds, alternating: odd rounds pair losers-bracket survivors
  // against each other, even rounds feed in that round's winners-bracket
  // casualties.
  const lbRounds = 2 * rounds - 2;
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
  for (let r = 2; r <= rounds; r++) {
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

  // --- grand final ---------------------------------------------------------
  // ponytail: one final, no bracket reset — whoever came up through the losers
  // bracket has to win it once. To add the reset, emit a second `final` round 2
  // match and show it only when round 1's winner arrived from `losers`.
  const final = blank("final", 1, 0, newId());
  wb[rounds - 1][0].winner_to = final.id;
  wb[rounds - 1][0].winner_to_slot = 1;
  lb[lbRounds - 1][0].winner_to = final.id;
  lb[lbRounds - 1][0].winner_to_slot = 2;

  return resolveBracket([...wb.flat(), ...lb.flat(), final]);
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

const isId = (id: number | undefined): id is number => id !== undefined;

/**
 * Works out who is playing every match, from the results that exist.
 *
 * Two things at once, because they cascade into each other: a played match
 * sends its winner and loser to their next seats, and a match that ends up
 * with a single player is a walkover, settled without anyone playing it. A
 * walkover then advances someone, which can create the next walkover.
 *
 * Non-mutating. The database only ever stores the seats known at generation;
 * this is what the screen renders and what `startTournament` persists.
 */
export function resolveBracket<T extends MatchLike>(matches: T[]): T[] {
  const out = matches.map((m) => ({ ...m }));
  const byId = new Map(out.map((m) => [m.id, m as MatchLike]));

  const key = (id: string, slot: number) => `${id}:${slot}`;

  // Seats that some other match is responsible for filling. Until that match
  // has produced its output, an empty seat means "not yet", not "nobody".
  const fed = new Set<string>();
  for (const m of out) {
    if (m.winner_to && m.winner_to_slot) fed.add(key(m.winner_to, m.winner_to_slot));
    if (m.loser_to && m.loser_to_slot) fed.add(key(m.loser_to, m.loser_to_slot));
  }

  const delivered = new Set<string>();
  const emitted = new Set<string>();
  const owed = (m: MatchLike, slot: 1 | 2) =>
    fed.has(key(m.id, slot)) && !delivered.has(key(m.id, slot));

  const send = (
    targetId: string | null,
    slot: number | null,
    playerId: number | null,
  ) => {
    if (!targetId || !slot) return;
    delivered.add(key(targetId, slot));
    seat(byId, targetId, slot, playerId);
  };

  let changed = true;
  while (changed) {
    changed = false;
    for (const match of out) {
      if (emitted.has(match.id)) continue;

      const present = [match.p1_id, match.p2_id].filter((id) => id !== null);

      if (match.winner_id === null) {
        // Still waiting on someone, or waiting for a human to play it.
        if (owed(match, 1) || owed(match, 2) || present.length === 2) continue;
        // Nobody left to arrive and at most one player here: a walkover.
        match.winner_id = present[0] ?? null;
      }

      const loser =
        present.length === 2
          ? match.p1_id === match.winner_id
            ? match.p2_id
            : match.p1_id
          : null;

      send(match.winner_to, match.winner_to_slot, match.winner_id);
      send(match.loser_to, match.loser_to_slot, loser);
      emitted.add(match.id);
      changed = true;
    }
  }
  return out;
}

/** Writes a player into a target seat. False when there is nothing to do,
 *  which is what stops the fixed-point loop above. */
function seat(
  byId: Map<string, MatchLike>,
  targetId: string | null,
  slot: number | null,
  playerId: number | null,
): boolean {
  if (!targetId || !slot || playerId === null) return false;
  const target = byId.get(targetId);
  if (!target) return false;
  const field = slot === 1 ? "p1_id" : "p2_id";
  if (target[field] === playerId) return false;
  target[field] = playerId;
  return true;
}

/** Reading order of a tournament: groups, then the main draw, then the
 *  repêchage it feeds, then the match everything has been building to. */
const SIDE_ORDER: BracketSide[] = [
  "group",
  "league",
  "winners",
  "losers",
  "final",
];

export type SeatSource = { number: number; kind: "winner" | "loser" };

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

export type Races = {
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
export function raceFor<
  T extends { bracket: BracketSide; round: number },
>(match: T, races: Races, all: T[]): number {
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
 * Third place is where the two formats differ. Double elimination has already
 * played it — the losers final decides it — while a single-elimination draw
 * never puts its two beaten semi-finalists in a room together, so they share
 * the step.
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

  const decided = (side: BracketSide) =>
    matches.filter((m) => m.bracket === side && m.winner_id !== null);

  // The losers final if there was one, otherwise the semi-finals.
  const beaten = decided("losers").length ? decided("losers") : decided("winners");
  const last = beaten.length ? Math.max(...beaten.map((m) => m.round)) : 0;

  return {
    first: final.winner_id,
    second: loserOf(final),
    third: beaten
      .filter((m) => m.round === last)
      .map(loserOf)
      .filter(notNull),
  };
}

/** Players eligible for a tournament: everyone, or one division. */
export const eligible = <T extends { category: Category }>(
  players: T[],
  category: Category | null,
) => (category === null ? players : players.filter((p) => p.category === category));
