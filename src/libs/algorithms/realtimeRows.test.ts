import { describe, expect, it } from "vitest";
import { removeRow, upsertRow } from "./realtimeRows";

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

describe("upsertRow", () => {
  it("replaces the optimistic stand-in when your own comment arrives over the socket — one row out, not two", () => {
    expect(upsertRow([mine(-1700)], mine(42), same)).toEqual([mine(42)]);
  });

  it("leaves a stand-in in place when it is not what arrived — someone else's row, or your own second comment, must not evict a pending one", () => {
    expect(
      upsertRow([mine(-1700, "still here")], mine(42), same).map(
        (r) => r.id,
      ),
    ).toEqual([-1700, 42]);
  });

  it("replaces a redelivered event in place, no duplicate and no reordering", () => {
    expect(
      upsertRow(
        [mine(42), mine(43, "second")],
        { ...mine(42), body: "edited" },
        same,
      ),
    ).toEqual([{ ...mine(42), body: "edited" }, mine(43, "second")]);
  });

  it("appends at the end, because useComments orders by created_at ascending", () => {
    expect(upsertRow([mine(1)], mine(2), same).map((r) => r.id)).toEqual([
      1, 2,
    ]);
  });

  it("never retires a real row with another real row, whatever the matcher says", () => {
    expect(upsertRow([mine(41)], mine(42), same).map((r) => r.id)).toEqual([
      41, 42,
    ]);
  });

  it("replaces a uuid-keyed row (a live match) by shared id with no matcher, since there is no stand-in to retire", () => {
    type L = { id: string; club_id: number; player_1_score: number };
    const live = (id: string, score = 0): L => ({
      id,
      club_id: 1,
      player_1_score: score,
    });

    expect(upsertRow([live("a")], live("a", 3))).toEqual([live("a", 3)]);
    expect(upsertRow([live("a")], live("b")).map((r) => r.id)).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("removeRow", () => {
  it("removes the matching row and leaves the rest", () => {
    expect(removeRow([mine(1), mine(2)], 1).map((r) => r.id)).toEqual([2]);
  });

  it("is a no-op when the id is not present", () => {
    expect(removeRow([mine(1)], 99).map((r) => r.id)).toEqual([1]);
  });

  it("works on uuid-keyed rows too", () => {
    type L = { id: string; club_id: number; player_1_score: number };
    const live = (id: string, score = 0): L => ({
      id,
      club_id: 1,
      player_1_score: score,
    });
    expect(
      removeRow([live("a"), live("b")], "a").map((r) => r.id),
    ).toEqual(["b"]);
  });
});
