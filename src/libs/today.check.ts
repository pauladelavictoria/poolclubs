/**
 * Self-check for the day's setup cookie. No test runner in this project:
 *   node src/libs/today.check.ts
 */
import assert from "node:assert/strict";
import {
  DEFAULT_SETUP,
  balanceDoubles,
  clampRace,
  decodeSetup,
  encodeSetup,
  pairKey,
  seatsNeeded,
  suggestGroups,
} from "./today.ts";

// A round trip is what the cookie is for.
const doubles = { mode: "doubles" as const, discipline: "8ball" as const, raceTo: 7 };
assert.equal(encodeSetup(doubles), "doubles:8ball:7");
assert.deepEqual(decodeSetup(encodeSetup(doubles)), doubles);

// Nothing set yet, which is every club's first night.
assert.deepEqual(decodeSetup(null), DEFAULT_SETUP);

// The case this exists for: a cookie is text a person can edit, and every part
// of it falls back on its own rather than taking the page down.
assert.deepEqual(decodeSetup("nonsense"), DEFAULT_SETUP);
assert.deepEqual(decodeSetup("doubles:snooker:5"), {
  ...DEFAULT_SETUP,
  mode: "doubles",
});
assert.equal(decodeSetup("single:9ball:0").raceTo, DEFAULT_SETUP.raceTo);
assert.equal(decodeSetup("single:9ball:900").raceTo, DEFAULT_SETUP.raceTo);
assert.equal(decodeSetup("single:9ball:2.5").raceTo, DEFAULT_SETUP.raceTo);

assert.equal(clampRace(0), 1);
assert.equal(clampRace(99), 50);
assert.equal(clampRace(7), 7);

// Four names before a doubles suggestion is one.
assert.equal(seatsNeeded(DEFAULT_SETUP), 2);
assert.equal(seatsNeeded({ ...DEFAULT_SETUP, mode: "doubles" }), 4);

// --- who could play whom -----------------------------------------------------

const p = (id: number) => ({ id });
const met = (pairs: [number, number][]) => {
  const seen = new Set(pairs.map(([a, b]) => pairKey(a, b)));
  return (a: number, b: number) => seen.has(pairKey(a, b));
};

assert.equal(pairKey(2, 1), pairKey(1, 2));

// Nobody has played. The two who have waited longest are dealt one to each
// table rather than played against each other, and the next two arrivals fill
// them: both of the long waits get a table.
assert.deepEqual(
  suggestGroups([p(1), p(2), p(3), p(4)], 2, met([])).map((g) => g.map((x) => x.id)),
  [
    [1, 3],
    [2, 4],
  ],
);

// The case this exists for: 1 and 2 have already played each other, so they are
// seeded to different tables and never meet again while there is another table.
assert.deepEqual(
  suggestGroups([p(1), p(2), p(3), p(4)], 2, met([[1, 2]])).map((g) =>
    g.map((x) => x.id),
  ),
  [
    [1, 3],
    [2, 4],
  ],
);

// Everybody has played everybody: it still offers something rather than nothing.
assert.deepEqual(
  suggestGroups([p(1), p(2)], 2, met([[1, 2]])).map((g) => g.map((x) => x.id)),
  [[1, 2]],
);

// Doubles: every one of the four has to be new to the other three.
assert.deepEqual(
  suggestGroups(
    [p(1), p(2), p(3), p(4), p(5)],
    4,
    met([
      [1, 2],
      [1, 3],
    ]),
  ).map((g) => g.map((x) => x.id)),
  [[1, 4, 5, 2]],
);

// The regression from the club floor: one free table, and somebody checks in at
// the door who is nowhere near the head of the queue. The suggestion must not
// move — it used to, because the number of matches being formed was derived
// from how many people were in the room.
const queue = [p(1), p(2), p(3), p(4), p(5)];
const before = suggestGroups(queue, 4, met([]), 1);
const after = suggestGroups([...queue, p(6), p(7), p(8), p(9)], 4, met([]), 1);
assert.deepEqual(
  before.map((g) => g.map((x) => x.id)),
  after.map((g) => g.map((x) => x.id)),
);
assert.deepEqual(before[0].map((x) => x.id), [1, 2, 3, 4]);

// Asked for one, so one — however many are waiting.
assert.equal(suggestGroups(queue, 2, met([]), 1).length, 1);

// Three people is not a doubles match.
assert.deepEqual(suggestGroups([p(1), p(2), p(3)], 4, met([])), []);

// The regression this was rewritten for: six waiting, and the only pair who
// have played are last in the queue. They must not be handed each other again
// just because everybody ahead of them is already placed.
const sixth = suggestGroups(
  [p(1), p(2), p(3), p(4), p(5), p(6)],
  2,
  met([[5, 6]]),
).map((g) => g.map((x) => x.id));
assert.equal(sixth.length, 3);
for (const [a, b] of sixth)
  assert.ok(!(a === 5 && b === 6) && !(a === 6 && b === 5), "5 and 6 rematched");

// --- levelling the pairs -----------------------------------------------------

const div = (id: number, category: number) => ({ id, category });

// The case this exists for: the queue hands over two firsts and two thirds, and
// the game to make out of them is one of each against one of each.
assert.deepEqual(
  balanceDoubles([div(1, 1), div(2, 1), div(3, 3), div(4, 3)]).map((x) => x.id),
  [1, 3, 2, 4],
);

// Already level, so the queue's own order stands.
assert.deepEqual(
  balanceDoubles([div(1, 1), div(2, 3), div(3, 2), div(4, 2)]).map((x) => x.id),
  [1, 2, 3, 4],
);

// Two seconds against a first and a third: level, and the closest this can get.
assert.deepEqual(
  balanceDoubles([div(1, 1), div(2, 2), div(3, 2), div(4, 3)]).map((x) => x.id),
  [1, 4, 2, 3],
);

// Singles, and anything else that is not four, is left alone.
assert.deepEqual(
  balanceDoubles([div(1, 1), div(2, 3)]).map((x) => x.id),
  [1, 2],
);

console.log("today: ok");
