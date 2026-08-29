/**
 * Self-check for the club night's rules. No test runner in this project:
 *   node src/libs/night.check.ts
 */
import assert from "node:assert/strict";
import type { LiveMatch, Player } from "../types/index.ts";
import {
  ABANDON_AFTER_MS,
  PRESENT_WINDOW_MS,
  bump,
  isAbandoned,
  isMatchOver,
  isPresent,
  leaderOf,
  seatsOf,
  seatsOfSide,
  unbump,
} from "./night.ts";

const NOW = new Date("2026-08-25T21:00:00.000Z").getTime();

const match = (over: Partial<LiveMatch> = {}): LiveMatch => ({
  id: "l1",
  club_id: 1,
  table_id: 1,
  player_1_id: 1,
  player_2_id: 2,
  player_1b_id: null,
  player_2b_id: null,
  mode: "single",
  discipline: "9ball",
  player_1_score: 0,
  player_2_score: 0,
  race_to: 5,
  last_side: null,
  challenge_id: null,
  tournament_match_id: null,
  started_at: new Date(NOW).toISOString(),
  updated_at: new Date(NOW).toISOString(),
  ...over,
});

const player = (over: Partial<Player> = {}): Player => ({
  id: 1,
  name: "p1",
  category: 2,
  club_id: 1,
  status: "active",
  person_id: 1,
  slug: "p1",
  user_id: null,
  avatar_url: null,
  is_public: true,
  present_since: null,
  queued_table_id: null,
  queued_at: null,
  is_device: false,
  device_table_id: null,
  ...over,
});

// --- presence ---------------------------------------------------------------

assert.equal(isPresent(player(), NOW), false);
assert.equal(
  isPresent(
    player({ present_since: new Date(NOW - 60_000).toISOString() }),
    NOW,
  ),
  true,
);
// The window is what ends a check-in — nobody has to remember to check out.
assert.equal(
  isPresent(
    player({
      present_since: new Date(NOW - PRESENT_WINDOW_MS - 1).toISOString(),
    }),
    NOW,
  ),
  false,
);

// --- abandonment ------------------------------------------------------------

assert.equal(isAbandoned(match(), NOW), false);
// Exactly at the boundary counts as abandoned, because the RLS policy's
// `updated_at < now() - interval '3 hours'` will let it be deleted from here on
// and a row the client still calls live but cannot clear is the bug this pair
// exists to prevent.
assert.equal(
  isAbandoned(
    match({ updated_at: new Date(NOW - ABANDON_AFTER_MS).toISOString() }),
    NOW,
  ),
  true,
);

// --- the race ---------------------------------------------------------------

assert.equal(
  isMatchOver(match({ player_1_score: 4, player_2_score: 4 })),
  false,
);
// Won by getting there, not by being ahead at the end.
assert.equal(
  isMatchOver(match({ player_1_score: 5, player_2_score: 4 })),
  true,
);

assert.equal(leaderOf(match({ player_1_score: 2, player_2_score: 2 })), null);
assert.equal(leaderOf(match({ player_1_score: 2, player_2_score: 3 })), 2);

// --- bump -------------------------------------------------------------------

assert.deepEqual(bump(match({ player_1_score: 1, player_2_score: 3 }), 1), {
  player_1_score: 2,
  player_2_score: 3,
  last_side: 1,
});
// A tap landing behind the finish sheet does nothing.
assert.equal(bump(match({ player_1_score: 5 }), 2), null);

// --- unbump -----------------------------------------------------------------

assert.deepEqual(
  unbump(match({ player_1_score: 4, player_2_score: 1, last_side: 2 }), 2),
  {
    player_1_score: 4,
    player_2_score: 0,
    // The case this exists for: a corrected score has no last rack, so the next
    // correction cannot take one off whoever happened to score before.
    last_side: null,
  },
);

// Nothing to take off. A side on zero is the floor; the CHECK constraint says
// the same thing in the database.
assert.equal(unbump(match({ player_1_score: 0, player_2_score: 3 }), 1), null);

// Allowed once the race is reached — this is what "keep playing" is, and the
// only way back from a mis-tap that ended the match.
assert.deepEqual(unbump(match({ player_1_score: 5, player_2_score: 2 }), 1), {
  player_1_score: 4,
  player_2_score: 2,
  last_side: null,
});

// --- seats -------------------------------------------------------------------

const pairs = match({
  mode: "doubles",
  player_1b_id: 11,
  player_2b_id: 22,
  player_1_score: 5,
  player_2_score: 3,
});

assert.deepEqual(seatsOfSide(match(), 1), [1]);
// The case this exists for: a partner is at the table, and anything asking who
// is playing has to say so or it will count them as waiting for one.
assert.deepEqual(seatsOfSide(pairs, 2), [2, 22]);
assert.deepEqual(seatsOf(pairs), [1, 11, 2, 22]);
assert.deepEqual(seatsOf(match()), [1, 2]);

console.log("night: ok");
