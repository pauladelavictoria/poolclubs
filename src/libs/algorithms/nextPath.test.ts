import { describe, expect, it } from "vitest";
import { isSafePath, loginFailedLink, loginLink } from "./nextPath";

describe("isSafePath", () => {
  it("allows same-site paths through", () => {
    expect(isSafePath("/drills/12")).toBe(true);
    expect(isSafePath("/drills/12?plan=3")).toBe(true);
  });

  it("refuses anything that could leave the site", () => {
    expect(isSafePath("//evil.com")).toBe(false);
    expect(isSafePath("/\\evil.com")).toBe(false);
    expect(isSafePath("https://evil.com")).toBe(false);
    expect(isSafePath("javascript:alert(1)")).toBe(false);
    expect(isSafePath("drills")).toBe(false);
    expect(isSafePath("")).toBe(false);
    expect(isSafePath(null)).toBe(false);
    expect(isSafePath(undefined)).toBe(false);
  });
});

describe("loginLink", () => {
  it("encodes the next path as a query param", () => {
    expect(loginLink("/drills/12")).toBe("/app/login?next=%2Fdrills%2F12");
  });
});

describe("loginFailedLink", () => {
  it("builds a link /auth/callback's own parsing reads back correctly", () => {
    // What /auth/callback builds must parse back into what the login route reads.
    const failed = new URL(loginFailedLink("/app/join/el-nueve"), "https://x");
    expect(failed.searchParams.get("next")).toBe("/app/join/el-nueve");
    expect(failed.searchParams.get("error")).toBe("link");
  });
});
