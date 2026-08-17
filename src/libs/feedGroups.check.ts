/**
 * Self-check for the feed's tournament grouping. No test runner in this project:
 *   node src/libs/feedGroups.check.ts
 */
import assert from "node:assert/strict";
import { groupTournamentRuns } from "./feedGroups.ts";

type G = { id: number };
const row = (at: string, ...ids: number[]) => ({
  at,
  games: ids.map((id) => ({ id })),
});
const other = (at: string) => ({ at, games: undefined });

// Which tournament each game id belongs to; 3 and 4 are club games.
const of = (g: G) => ({ 1: 10, 2: 10, 5: 10, 6: 11 })[g.id];

const ids = (rows: { games?: G[] }[]) =>
  rows.map((r) => r.games?.map((g) => g.id) ?? null);

// Neighbours from the same tournament fold into one row, keeping feed order
assert.deepEqual(
  ids(
    groupTournamentRuns(
      [row("2026-03-03T20:00:00Z", 1), row("2026-03-03T19:00:00Z", 2)],
      of,
    ),
  ),
  [[1, 2]],
);

// A different tournament starts its own row
assert.deepEqual(
  ids(
    groupTournamentRuns(
      [row("2026-03-03T20:00:00Z", 1), row("2026-03-03T19:00:00Z", 6)],
      of,
    ),
  ),
  [[1], [6]],
);

// Club games never fold — not with each other, and not into a tournament run
assert.deepEqual(
  ids(
    groupTournamentRuns(
      [
        row("2026-03-03T20:00:00Z", 3),
        row("2026-03-03T19:00:00Z", 4),
        row("2026-03-03T18:00:00Z", 1),
      ],
      of,
    ),
  ),
  [[3], [4], [1]],
);

// Anything else between two fixtures breaks the run
assert.deepEqual(
  ids(
    groupTournamentRuns(
      [
        row("2026-03-03T20:00:00Z", 1),
        other("2026-03-03T19:30:00Z"),
        row("2026-03-03T19:00:00Z", 2),
      ],
      of,
    ),
  ),
  [[1], null, [2]],
);

// So does a day boundary: a card cannot sit under two day headings
assert.deepEqual(
  ids(
    groupTournamentRuns(
      [row("2026-03-03T10:00:00Z", 1), row("2026-03-02T22:00:00Z", 2)],
      of,
    ),
  ),
  [[1], [2]],
);

// The caller's rows are left alone — grouping twice gives the same answer
const rows = [row("2026-03-03T20:00:00Z", 1), row("2026-03-03T19:00:00Z", 2)];
assert.deepEqual(ids(groupTournamentRuns(rows, of)), [[1, 2]]);
assert.deepEqual(ids(rows), [[1], [2]]);
assert.deepEqual(ids(groupTournamentRuns(rows, of)), [[1, 2]]);

console.log("feed grouping holds");
