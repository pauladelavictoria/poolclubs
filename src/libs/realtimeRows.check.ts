/**
 * Self-check for the realtime list edits. No test runner in this project:
 *   node src/libs/realtimeRows.check.ts
 */
import assert from "node:assert/strict";
import { removeRow, upsertRow } from "./realtimeRows.ts";

type C = {
  id: number;
  author_player_id: number;
  game_id: string | null;
  body: string;
};

const same = (a: C, b: C) =>
  a.author_player_id === b.author_player_id &&
  a.game_id === b.game_id &&
  a.body === b.body;

const mine = (id: number, body = "nice shot"): C => ({
  id,
  author_player_id: 7,
  game_id: "g1",
  body,
});

// The case this exists for: your own comment arrives over the socket while the
// optimistic stand-in is still on screen. One row out, not two.
assert.deepEqual(upsertRow([mine(-1700)], mine(42), same), [mine(42)]);

// A stand-in that is not what arrived stays put — someone else's row, or your
// own second comment, must not evict a pending one.
assert.deepEqual(
  upsertRow([mine(-1700, "still here")], mine(42), same).map((r) => r.id),
  [-1700, 42],
);

// Redelivered event, or the refetch beat the socket: replace in place, no
// duplicate and no reordering.
assert.deepEqual(
  upsertRow([mine(42), mine(43, "second")], { ...mine(42), body: "edited" }, same),
  [{ ...mine(42), body: "edited" }, mine(43, "second")],
);

// Appended at the end, because useComments orders by created_at ascending
assert.deepEqual(upsertRow([mine(1)], mine(2), same).map((r) => r.id), [1, 2]);

// A real row never retires another real row, whatever the matcher says
assert.deepEqual(upsertRow([mine(41)], mine(42), same).map((r) => r.id), [41, 42]);

assert.deepEqual(removeRow([mine(1), mine(2)], 1).map((r) => r.id), [2]);
assert.deepEqual(removeRow([mine(1)], 99).map((r) => r.id), [1]);

console.log("realtimeRows: ok");
