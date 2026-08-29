import { describe, expect, it } from "vitest";
import { groupTournamentRuns } from "./feedGroups";

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

describe("groupTournamentRuns", () => {
  it("folds neighbours from the same tournament into one row, keeping feed order", () => {
    expect(
      ids(
        groupTournamentRuns(
          [row("2026-03-03T20:00:00Z", 1), row("2026-03-03T19:00:00Z", 2)],
          of,
        ),
      ),
    ).toEqual([[1, 2]]);
  });

  it("starts its own row for a different tournament", () => {
    expect(
      ids(
        groupTournamentRuns(
          [row("2026-03-03T20:00:00Z", 1), row("2026-03-03T19:00:00Z", 6)],
          of,
        ),
      ),
    ).toEqual([[1], [6]]);
  });

  it("never folds club games — not with each other, and not into a tournament run", () => {
    expect(
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
    ).toEqual([[3], [4], [1]]);
  });

  it("breaks the run when anything else sits between two fixtures", () => {
    expect(
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
    ).toEqual([[1], null, [2]]);
  });

  it("also breaks the run at a day boundary, since a card cannot sit under two day headings", () => {
    expect(
      ids(
        groupTournamentRuns(
          [row("2026-03-03T10:00:00Z", 1), row("2026-03-02T22:00:00Z", 2)],
          of,
        ),
      ),
    ).toEqual([[1], [2]]);
  });

  it("leaves the caller's rows alone — grouping twice gives the same answer", () => {
    const rows = [
      row("2026-03-03T20:00:00Z", 1),
      row("2026-03-03T19:00:00Z", 2),
    ];
    expect(ids(groupTournamentRuns(rows, of))).toEqual([[1, 2]]);
    expect(ids(rows)).toEqual([[1], [2]]);
    expect(ids(groupTournamentRuns(rows, of))).toEqual([[1, 2]]);
  });
});
