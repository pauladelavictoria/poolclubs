import { describe, expect, it } from "vitest";
import { canEditGame } from "./gamePermissions";
import { GLOBAL_CLUB_SLUG } from "./features";

const ME = 7;
const OTHER = 8;
const singles = { player_1_id: ME, player_2_id: OTHER };
const doubles = {
  player_1_id: 1,
  player_2_id: 2,
  player_1b_id: ME,
  player_2b_id: 3,
};

describe("canEditGame", () => {
  it("lets a club admin fix any result in their club", () => {
    expect(canEditGame(singles, OTHER, "some-club", true)).toBe(true);
  });

  it("keeps a real club's results admin-only, even for who played them", () => {
    expect(canEditGame(singles, ME, "some-club", false)).toBe(false);
  });

  it("lets a lobby player fix a result they played in", () => {
    expect(canEditGame(singles, ME, GLOBAL_CLUB_SLUG, false)).toBe(true);
  });

  it("counts the doubles partners as having played", () => {
    expect(canEditGame(doubles, ME, GLOBAL_CLUB_SLUG, false)).toBe(true);
  });

  it("blocks a lobby player from a result they were not in", () => {
    expect(canEditGame(singles, 99, GLOBAL_CLUB_SLUG, false)).toBe(false);
  });

  // An empty seat must not match a viewer the caller could not identify.
  it("does not match a missing player against an empty doubles seat", () => {
    expect(canEditGame(singles, null, GLOBAL_CLUB_SLUG, false)).toBe(false);
    expect(canEditGame(singles, undefined, GLOBAL_CLUB_SLUG, false)).toBe(false);
  });

  it("needs a club to decide at all", () => {
    expect(canEditGame(singles, ME, null, false)).toBe(false);
  });
});
