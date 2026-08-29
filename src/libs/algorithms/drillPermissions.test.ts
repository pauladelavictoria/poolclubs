import { describe, expect, it } from "vitest";
import { canEditDrill } from "./drillPermissions";

const ME = "uuid-me";
const OTHER = "uuid-other";

describe("canEditDrill", () => {
  it("lets the creator edit their own drill", () => {
    expect(canEditDrill(ME, ME, false)).toBe(true);
  });

  it("blocks the creator from editing anyone else's", () => {
    expect(canEditDrill(OTHER, ME, false)).toBe(false);
  });

  it("lets an admin edit anything, including the seeded drills", () => {
    expect(canEditDrill(OTHER, ME, true)).toBe(true);
    expect(canEditDrill(null, ME, true)).toBe(true);
  });

  it("closes seeded drills (null owner) to non-admins", () => {
    expect(canEditDrill(null, ME, false)).toBe(false);
  });

  it("does not match two unknowns against each other", () => {
    expect(canEditDrill(null, null, false)).toBe(false);
    expect(canEditDrill(undefined, undefined, false)).toBe(false);
  });

  it("never lets a signed-out viewer edit", () => {
    expect(canEditDrill(ME, null, false)).toBe(false);
  });
});
