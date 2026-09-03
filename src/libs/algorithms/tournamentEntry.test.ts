import { describe, expect, it } from "vitest";
import { canEnterTournament } from "./tournamentEntry";

describe("canEnterTournament", () => {
  it("opens a combined tournament to any division", () => {
    expect(canEnterTournament(null, 1)).toBe(true);
    expect(canEnterTournament(null, 3)).toBe(true);
  });

  it("keeps a single-division tournament to its own division", () => {
    expect(canEnterTournament(2, 2)).toBe(true);
    expect(canEnterTournament(2, 1)).toBe(false);
    expect(canEnterTournament(2, 3)).toBe(false);
  });

  it("lets nobody in without a division of their own", () => {
    expect(canEnterTournament(null, null)).toBe(false);
    expect(canEnterTournament(null, undefined)).toBe(false);
    expect(canEnterTournament(2, undefined)).toBe(false);
  });
});
