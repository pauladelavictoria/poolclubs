import { describe, expect, it } from "vitest";
import type { Game, Player } from "../types/index";
import { tallyDaily } from "./dailyScore";

const player = (id: number, category: 1 | 2 | 3): Player => ({
  id,
  name: `p${id}`,
  category,
  club_id: 1,
  status: "active",
  person_id: id,
  slug: `p${id}`,
  user_id: null,
  avatar_url: null,
  is_public: true,
  present_since: null,
  queued_table_id: null,
  queued_at: null,
  is_device: false,
  device_table_id: null,
});

/** Same division either side, so no margin is expected of anyone by default. */
const PLAYERS = [player(1, 2), player(2, 2)];

let seq = 0;
const game = (
  p1: number,
  s1: number,
  p2: number,
  s2: number,
  at = `2026-03-0${++seq}T10:00:00.000Z`,
): Game => ({
  id: `g${seq}`,
  club_id: 1,
  player_1_id: p1,
  player_2_id: p2,
  player_1_score: s1,
  player_2_score: s2,
  player_1b_id: null,
  player_2b_id: null,
  played_at: at,
  created_at: at,
  mode: "single",
  discipline: "9ball",
});

const byId = (rows: ReturnType<typeof tallyDaily>, id: number) =>
  rows.find((r) => r.playerId === id)!;

describe("tallyDaily", () => {
  it("follows racks to whoever won them, not the column they were written in", () => {
    // The bug this exists for: player 2 wins 5-2, so player 2 has five and
    // player 1 has two.
    const rows = tallyDaily([game(1, 2, 2, 5)], PLAYERS);
    expect(byId(rows, 2).racksWon).toBe(5);
    expect(byId(rows, 2).racksLosed).toBe(2);
    expect(byId(rows, 1).racksWon).toBe(2);
    expect(byId(rows, 1).racksLosed).toBe(5);
    expect(byId(rows, 2).gamesWon).toBe(1);
    expect(byId(rows, 1).gamesWon).toBe(0);
  });

  it("gives the same answer with the winner in column one, for symmetry", () => {
    const rows = tallyDaily([game(1, 5, 2, 2)], PLAYERS);
    expect(byId(rows, 1).racksWon).toBe(5);
    expect(byId(rows, 1).racksLosed).toBe(2);
    expect(byId(rows, 2).racksWon).toBe(2);
  });

  it("does not count a draw as a result — it used to make player 2 both winner and loser, worth two matches and a win that never happened", () => {
    const rows = tallyDaily([game(1, 3, 2, 3)], PLAYERS);
    expect(rows).toEqual([]);
  });

  it("pays 1 for playing, 1 for the win, half per rack past the expected margin — equal divisions expect 0, so a 5-2 win pays 2 + 3 * 0.5", () => {
    const rows = tallyDaily([game(1, 5, 2, 2)], PLAYERS);
    expect(byId(rows, 1).points).toBe(3.5);
    expect(byId(rows, 2).points).toBe(1);
  });

  it("only bonuses the rack past the expected two-division margin: 2 + 1 * 0.5", () => {
    // A stronger player (category 1) beating a weaker one (3) is expected to
    // win by two, so only the third rack of a 3-0 earns a bonus.
    const rows = tallyDaily([game(1, 3, 2, 0)], [player(1, 1), player(2, 3)]);
    expect(byId(rows, 1).points).toBe(2.5);
  });

  it("counts every rack of the margin when beating someone two divisions above you: 2 + (3 - -2) * 0.5", () => {
    // Beating someone two divisions above you is expected to be a loss, so
    // every rack of the margin counts.
    const rows = tallyDaily([game(1, 3, 2, 0)], [player(1, 3), player(2, 1)]);
    expect(byId(rows, 1).points).toBe(4.5);
  });

  it("pays only the win, nothing more, for a win under the expected margin", () => {
    const rows = tallyDaily([game(1, 3, 2, 2)], [player(1, 1), player(2, 3)]);
    expect(byId(rows, 1).points).toBe(2);
  });

  it("skips unknown players and unparseable scores rather than counting them", () => {
    expect(tallyDaily([game(1, 5, 99, 2)], PLAYERS)).toEqual([]);

    // The columns are bigint, so a non-number can only arrive if something
    // wrote one another way. Skipped rather than scored as a zero.
    const bad = { ...game(1, 5, 2, 2), player_1_score: NaN };
    expect(tallyDaily([bad], PLAYERS)).toEqual([]);
  });

  it("shows form as the ten most recent, newest first — not the ten oldest, which is what pushing everything and shifting the overflow left behind", () => {
    // Twelve matches, oldest first in the input, player 1 winning only the last
    const many = Array.from({ length: 12 }, (_, i) =>
      game(
        1,
        i === 11 ? 5 : 0,
        2,
        i === 11 ? 0 : 5,
        `2026-04-${String(i + 1).padStart(2, "0")}T10:00:00.000Z`,
      ),
    );
    const rows = tallyDaily(many, PLAYERS);
    const form = byId(rows, 1).last10Games;
    expect(form.length).toBe(10);
    // The most recent match is player 1's only win, and it leads
    expect(form[0]).toBe(true);
    expect(form.slice(1).some(Boolean)).toBe(false);
    // Every match still counts towards the totals, only the form is capped
    expect(byId(rows, 1).gamesPlayed).toBe(12);
  });

  it("orders by points, then wins, then fewest racks conceded, then lower division", () => {
    const rows = tallyDaily(
      [game(1, 5, 2, 0), game(2, 5, 3, 4), game(3, 0, 1, 5)],
      [player(1, 2), player(2, 2), player(3, 2)],
    );
    expect(rows.map((r) => r.playerId)).toEqual([1, 2, 3]);
    expect(rows[0].points >= rows[1].points).toBe(true);
  });

  it("leaves the input array alone — it is react-query's cached data", () => {
    const games = [game(1, 5, 2, 0), game(2, 5, 1, 0)];
    const before = games.map((g) => g.id);
    tallyDaily(games, PLAYERS);
    expect(games.map((g) => g.id)).toEqual(before);
  });
});
