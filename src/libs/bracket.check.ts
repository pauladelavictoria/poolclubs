/**
 * Self-check for fixture generation. No test runner in this project:
 *   node src/libs/bracket.check.ts
 */
import assert from "node:assert/strict";
import {
  bracketIndex,
  buildGroups,
  buildKnockout,
  buildLeague,
  placings,
  qualifiers,
  raceFor,
  resolveBracket,
  seedOrder,
  type PlannedMatch,
} from "./bracket.ts";

/** Deterministic ids, so a failure names the same match twice running. */
const ids = () => {
  let n = 0;
  return () => `m${++n}`;
};

const field = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const of = (ms: PlannedMatch[], bracket: string) =>
  ms.filter((m) => m.bracket === bracket);

// --- seeding -----------------------------------------------------------------

assert.deepEqual(seedOrder(2), [1, 2]);
assert.deepEqual(seedOrder(4), [1, 4, 2, 3]);
assert.deepEqual(seedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6], "1 meets 8, not 2");
// Whatever the size, the pairing is always i against n+1−i.
for (const size of [2, 4, 8, 16, 32]) {
  const order = seedOrder(size);
  assert.equal(new Set(order).size, size, "every seed placed once");
  for (let i = 0; i < size; i += 2) {
    assert.equal(order[i] + order[i + 1], size + 1);
  }
}

// --- single elimination ------------------------------------------------------

for (const [n, expected] of [
  [2, 1],
  [4, 3],
  [5, 7],
  [8, 7],
  [16, 15],
] as const) {
  const ms = buildKnockout(field(n), { doubleElim: false }, ids());
  assert.equal(ms.length, expected, `single elim, ${n} players`);
  assert.equal(of(ms, "losers").length, 0, "no losers bracket");
  assert.equal(of(ms, "final").length, 1, "exactly one final");
  assert.equal(
    ms.filter((m) => m.winner_to === null).length,
    1,
    "only the final leads nowhere",
  );
}

// --- double elimination ------------------------------------------------------

for (const n of [4, 5, 8, 16]) {
  const ms = buildKnockout(field(n), { doubleElim: true }, ids());
  const size = 2 ** Math.ceil(Math.log2(n));
  // A double-elimination bracket is 2·size − 2 matches: everyone but the
  // champion loses twice, plus the single grand final.
  assert.equal(ms.length, 2 * size - 2, `double elim, ${n} players`);
  assert.equal(of(ms, "final").length, 1);

  // Every match but the final sends its winner somewhere.
  for (const m of ms) {
    if (m.bracket === "final") {
      assert.equal(m.winner_to, null);
      continue;
    }
    assert.ok(m.winner_to, `${m.bracket} r${m.round}s${m.slot} has no winner_to`);
    assert.ok(m.winner_to_slot === 1 || m.winner_to_slot === 2);
  }

  // Every seat is fed by at most one match, or the bracket would overwrite it.
  const seats = new Map<string, number>();
  for (const m of ms) {
    for (const [to, slot] of [
      [m.winner_to, m.winner_to_slot],
      [m.loser_to, m.loser_to_slot],
    ] as const) {
      if (!to || !slot) continue;
      const key = `${to}:${slot}`;
      seats.set(key, (seats.get(key) ?? 0) + 1);
    }
  }
  for (const [key, count] of seats) assert.equal(count, 1, `two feeders for ${key}`);

  // Only the winners bracket sheds losers, and only into the losers bracket.
  const byId = new Map(ms.map((m) => [m.id, m]));
  for (const m of ms) {
    if (!m.loser_to) continue;
    assert.equal(m.bracket, "winners");
    assert.equal(byId.get(m.loser_to)!.bracket, "losers");
  }
}

// --- byes --------------------------------------------------------------------

{
  // Five players in an eight-slot bracket: three walkovers, resolved up front.
  const ms = buildKnockout(field(5), { doubleElim: true }, ids());
  const round1 = of(ms, "winners").filter((m) => m.round === 1);
  const byes = round1.filter((m) => m.p1_id === null || m.p2_id === null);
  assert.equal(byes.length, 3, "three of the four openers are walkovers");
  for (const m of byes) {
    assert.ok(m.winner_id !== null, "a walkover is settled at generation");
  }
  const contested = round1.filter((m) => m.p1_id !== null && m.p2_id !== null);
  assert.equal(contested.length, 1);
  assert.equal(contested[0].winner_id, null, "a real match waits for a result");

  // Walkover winners are already standing in the next round.
  const round2 = of(ms, "winners").filter((m) => m.round === 2);
  assert.equal(
    round2.filter((m) => m.p1_id !== null || m.p2_id !== null).length,
    2,
    "both semi-finals already know at least one player",
  );

}

// --- playing a whole bracket out ---------------------------------------------

/**
 * Files a result for every match that has two players, re-deriving the bracket
 * after each one, until nothing is playable. `pick` decides who wins; the
 * default is the better seed.
 */
function playOut(
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
    assert.ok(--guard > 0, "playthrough did not converge");
  }
  return current;
}

for (const n of [2, 3, 4, 5, 6, 7, 8, 11, 16]) {
  for (const doubleElim of [false, true]) {
    const played = playOut(buildKnockout(field(n), { doubleElim }, ids()));
    const final = played.find((m) => m.bracket === "final")!;
    assert.equal(
      final.winner_id,
      1,
      `${n} players, doubleElim=${doubleElim}: the top seed should win out`,
    );
    // Every match either produced a champion or was an empty slot left by a
    // walkover. Nothing is stuck waiting for a player who is never coming.
    for (const m of played) {
      const stuck =
        m.winner_id === null && (m.p1_id !== null || m.p2_id !== null);
      assert.ok(!stuck, `${m.bracket} r${m.round}s${m.slot} never resolved`);
    }
  }
}

{
  // The point of a losers bracket: one defeat is survivable, two is not.
  // Seed 2 loses its opener to seed 1 and still reaches the grand final.
  const ms = buildKnockout(field(4), { doubleElim: true }, ids());
  const played = playOut(ms, (a, b) => (a === 1 || b === 1 ? 1 : Math.min(a, b)));
  const final = played.find((m) => m.bracket === "final")!;
  assert.equal(final.p1_id, 1, "the unbeaten player comes in through seat 1");
  assert.notEqual(final.p2_id, null, "somebody comes up from the losers bracket");
  assert.notEqual(final.p2_id, 1);
}

// --- advancement -------------------------------------------------------------

{
  const ms = buildKnockout(field(4), { doubleElim: true }, ids());
  const r1 = of(ms, "winners").filter((m) => m.round === 1);
  // 1 beats 4, 3 beats 2.
  r1[0].winner_id = 1;
  r1[1].winner_id = 3;

  const resolved = resolveBracket(ms);
  const wbFinal = resolved.find((m) => m.bracket === "winners" && m.round === 2)!;
  assert.deepEqual([wbFinal.p1_id, wbFinal.p2_id], [1, 3], "winners advance");

  const lb = resolved.filter((m) => m.bracket === "losers" && m.round === 1)[0];
  assert.deepEqual([lb.p1_id, lb.p2_id], [4, 2], "losers drop into round 1");
}

// --- leagues -----------------------------------------------------------------

for (const n of [2, 3, 4, 5, 8]) {
  for (const legs of [1, 2] as const) {
    const ms = buildLeague(field(n), legs, ids());
    assert.equal(
      ms.length,
      (legs * n * (n - 1)) / 2,
      `${n} players, ${legs} leg(s)`,
    );
    for (const id of field(n)) {
      const played = ms.filter((m) => m.p1_id === id || m.p2_id === id);
      assert.equal(played.length, legs * (n - 1), `player ${id} meets everyone`);
      assert.equal(
        new Set(played.map((m) => (m.p1_id === id ? m.p2_id : m.p1_id))).size,
        n - 1,
        `player ${id} meets a different opponent each time`,
      );
    }
    // No fixture is scheduled against an empty seat, odd field or not.
    for (const m of ms) assert.ok(m.p1_id !== null && m.p2_id !== null);
    // Nobody plays twice on the same matchday.
    const days = new Map<number, number[]>();
    for (const m of ms) {
      const day = days.get(m.round) ?? [];
      day.push(m.p1_id!, m.p2_id!);
      days.set(m.round, day);
    }
    for (const [round, players] of days) {
      assert.equal(new Set(players).size, players.length, `clash on round ${round}`);
    }
  }
}

// --- groups ------------------------------------------------------------------

{
  const ms = buildGroups(field(12), 4, 1, ids());
  const groups = [1, 2, 3, 4].map((g) => ms.filter((m) => m.group_no === g));
  for (const g of groups) {
    const members = new Set(g.flatMap((m) => [m.p1_id!, m.p2_id!]));
    assert.equal(members.size, 3, "four groups of three");
    assert.equal(g.length, 3, "three fixtures in a group of three");
  }
  assert.ok(
    groups[0].some((m) => m.p1_id === 1 || m.p2_id === 1),
    "the top seed heads the first group",
  );
  // Snake seeding spreads the strength: seeds 1..4 land one per group.
  const topSeedGroups = [1, 2, 3, 4].map((seed) =>
    ms.find((m) => m.p1_id === seed || m.p2_id === seed)!.group_no,
  );
  assert.equal(new Set(topSeedGroups).size, 4, "top seeds are not stacked");
  for (const m of ms) assert.equal(m.bracket, "group");
}

// --- qualifiers --------------------------------------------------------------

{
  // Four groups; winners 10,20,30,40 and runners-up 11,21,31,41.
  const tables = [10, 20, 30, 40].map((w) => [
    { playerId: w },
    { playerId: w + 1 },
  ]);
  const seeds = qualifiers(tables, 8);
  assert.deepEqual(seeds, [10, 20, 30, 40, 11, 21, 31, 41]);

  // Fed to the bracket, no opener is a rerun of a group match.
  const ms = buildKnockout(seeds, { doubleElim: false }, ids());
  const groupOf = (id: number) => Math.floor(id / 10);
  for (const m of ms.filter((x) => x.round === 1)) {
    assert.notEqual(
      groupOf(m.p1_id!),
      groupOf(m.p2_id!),
      `${m.p1_id} v ${m.p2_id} already met in the group phase`,
    );
  }
}

// --- numbering and seat provenance -------------------------------------------

{
  const ms = buildKnockout(field(8), { doubleElim: true }, ids());
  const index = bracketIndex(ms);

  const numbers = ms.map((m) => index.number(m.id)!);
  assert.equal(new Set(numbers).size, ms.length, "every match numbered once");
  assert.deepEqual(
    [...numbers].sort((a, b) => a - b),
    ms.map((_, i) => i + 1),
    "numbered 1..n with no gaps",
  );

  // The winners bracket is played first, so it holds the low numbers.
  const wb = ms.filter((m) => m.bracket === "winners");
  const lb = ms.filter((m) => m.bracket === "losers");
  assert.ok(
    Math.max(...wb.map((m) => index.number(m.id)!)) <
      Math.min(...lb.map((m) => index.number(m.id)!)),
    "the main draw is numbered before the repêchage",
  );

  // Every empty seat in a fresh bracket says where its player is coming from,
  // and names a match that is played earlier than the one waiting for it.
  for (const m of ms) {
    for (const slot of [1, 2] as const) {
      const occupied = slot === 1 ? m.p1_id : m.p2_id;
      if (occupied !== null || m.winner_id !== null) continue;
      const from = index.source(m.id, slot);
      assert.ok(from, `${m.bracket} r${m.round}s${m.slot} seat ${slot} unexplained`);
      assert.ok(
        from!.number < index.number(m.id)!,
        "a seat is filled by an earlier match",
      );
    }
  }
}

{
  // A walkover has no loser, so the seat it would have fed promises nothing.
  const ms = buildKnockout(field(5), { doubleElim: true }, ids());
  const index = bracketIndex(ms);
  const bye = ms.find(
    (m) => m.winner_id !== null && m.loser_to !== null && m.p2_id === null,
  )!;
  assert.notEqual(bye.loser_to, null);
  assert.equal(
    index.source(bye.loser_to!, bye.loser_to_slot as 1 | 2),
    undefined,
    "nobody is promised the loser of a match that was never played",
  );
}

// --- race lengths ------------------------------------------------------------

{
  const races = { race_to: 5, race_semi: 6, race_final: 7 };

  // Double elimination: the grand final is the final, and the last round of
  // each half is a semi — both of them feed it.
  const de = buildKnockout(field(8), { doubleElim: true }, ids());
  const race = (m: (typeof de)[number]) => raceFor(m, races, de);
  const lastWinners = Math.max(
    ...de.filter((m) => m.bracket === "winners").map((m) => m.round),
  );
  const lastLosers = Math.max(
    ...de.filter((m) => m.bracket === "losers").map((m) => m.round),
  );

  assert.equal(race(de.find((m) => m.bracket === "final")!), 7);
  assert.equal(
    race(de.find((m) => m.bracket === "winners" && m.round === lastWinners)!),
    6,
  );
  assert.equal(
    race(de.find((m) => m.bracket === "losers" && m.round === lastLosers)!),
    6,
  );
  assert.equal(
    race(de.find((m) => m.bracket === "winners" && m.round === 1)!),
    5,
    "an opener is the base race",
  );

  // Single elimination: the last winners round is the semi, and the match after
  // it is already labelled `final` — so nothing is counted as both.
  const se = buildKnockout(field(8), { doubleElim: false }, ids());
  const semis = se.filter((m) => m.bracket === "winners" && m.round === 2);
  assert.equal(semis.length, 2);
  for (const m of semis) assert.equal(raceFor(m, races, se), 6);
  assert.equal(raceFor(se.find((m) => m.bracket === "final")!, races, se), 7);

  // A round robin has no closing stage.
  const league = buildLeague(field(4), 1, ids());
  for (const m of league) assert.equal(raceFor(m, races, league), 5);

  // Unset overrides fall back to the base race rather than to nothing.
  const flat = { race_to: 4, race_semi: null, race_final: null };
  for (const m of de) assert.equal(raceFor(m, flat, de), 4);
}

// --- the podium --------------------------------------------------------------

{
  // Double elimination: the losers final decides third, so it is one player.
  const played = playOut(buildKnockout(field(8), { doubleElim: true }, ids()));
  const { first, second, third } = placings(played);
  assert.equal(first, 1, "the top seed wins out");
  assert.notEqual(second, null);
  assert.notEqual(second, first);
  assert.equal(third.length, 1, "third place was actually played");
  assert.ok(!third.includes(first!) && !third.includes(second!));
}

{
  // Single elimination never separates the two beaten semi-finalists.
  const played = playOut(buildKnockout(field(8), { doubleElim: false }, ids()));
  const { first, second, third } = placings(played);
  assert.equal(first, 1);
  assert.equal(third.length, 2, "joint third");
  assert.equal(new Set([first, second, ...third]).size, 4, "four distinct names");
}

{
  // Two players is a final and nothing else — nobody is third.
  const played = playOut(buildKnockout(field(2), { doubleElim: true }, ids()));
  assert.deepEqual(placings(played), { first: 1, second: 2, third: [] });
}

{
  // Nothing to show until the final has been played.
  const unplayed = buildKnockout(field(4), { doubleElim: true }, ids());
  assert.deepEqual(placings(unplayed), {
    first: null,
    second: null,
    third: [],
  });
}

console.log("bracket.check.ts ok");
