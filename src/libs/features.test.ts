import { describe, expect, it } from "vitest";
import { DRILLS_ENABLED, isHiddenPath } from "./features";

// Only meaningful while the feature is off — flipping the flag flips every
// case, so this suite skips itself (rather than failing) once drills ship.
describe.skipIf(DRILLS_ENABLED)("isHiddenPath", () => {
  it("hides both halves of the feature, public and club-scoped", () => {
    expect(isHiddenPath("/drills")).toBe(true);
    expect(isHiddenPath("/drills/12")).toBe(true);
    expect(isHiddenPath("/app/acme/drills")).toBe(true);
    expect(isHiddenPath("/app/acme/drills/12/edit")).toBe(true);
    expect(isHiddenPath("/app/acme/players/7/training")).toBe(true);
    expect(isHiddenPath("/app/acme/players/7/training/plan")).toBe(true);
    expect(isHiddenPath("/app/acme/me/training/plan")).toBe(true);
  });

  it("matches whole segments only, so a club named after the word keeps working", () => {
    expect(isHiddenPath("/app/drills-r-us")).toBe(false);
    expect(isHiddenPath("/app/acme/trainings")).toBe(false);
    expect(isHiddenPath("/app/acme/ranking")).toBe(false);
    expect(isHiddenPath("/")).toBe(false);
  });
});
