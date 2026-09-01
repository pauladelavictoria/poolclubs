import { describe, expect, it } from "vitest";
import { isBye } from "./MatchList";
import type { TournamentMatch } from "@/types";

const match = (p: Partial<TournamentMatch>) =>
  ({ p1_id: 1, p2_id: 2, winner_id: null, ...p }) as TournamentMatch;

describe("isBye", () => {
  it("is a bye when a settled match has an empty seat", () => {
    expect(isBye(match({ p2_id: null, winner_id: 1 }))).toBe(true);
    expect(isBye(match({ p1_id: null, winner_id: 2 }))).toBe(true);
  });

  it("is not a bye when both seats are filled, forfeits included", () => {
    expect(isBye(match({ winner_id: 1 }))).toBe(false);
  });

  it("is not a bye when a seat is merely undecided", () => {
    expect(isBye(match({ p2_id: null }))).toBe(false);
  });
});
