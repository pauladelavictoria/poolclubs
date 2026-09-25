import { describe, expect, it, vi } from "vitest";
import { dbErrorMessage } from "./dbError";

describe("dbErrorMessage — which toast a failed write gets", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const err = (code: string, message = "boom") => ({ code, message });

  it.each([
    ["42501", "common.deniedError"],
    // An update RLS filtered to nothing, as .single() reports it.
    ["PGRST116", "common.deniedError"],
    ["PGRST301", "common.sessionExpired"],
    ["PGRST303", "common.sessionExpired"],
    // Schema drift and missing functions are bugs, not the reader's to fix.
    ["PGRST204", "common.error"],
    ["PGRST202", "common.error"],
    ["23505", "common.error"],
    ["P0001", "common.error"],
  ])("%s → %s by default", (code, key) => {
    expect(dbErrorMessage(err(code), "test")).toBe(key);
  });

  it("uses the caller's wording where it has some", () => {
    const keys = {
      duplicate: "live.startError",
      denied: "live.startDenied",
      refused: "live.startRefused",
      fallback: "players.createError",
    } as const;
    expect(dbErrorMessage(err("23505"), "t", keys)).toBe("live.startError");
    expect(dbErrorMessage(err("42501"), "t", keys)).toBe("live.startDenied");
    expect(dbErrorMessage(err("P0001"), "t", keys)).toBe("live.startRefused");
    expect(dbErrorMessage(new TypeError("x"), "t", keys)).toBe(
      "players.createError",
    );
  });
});
