import { describe, expect, it } from "vitest";
import { isOtpType, pickBranch } from "./callbackParams";

const at = (query: string) =>
  new URL(`https://poolclubs.app/auth/callback${query}`);

describe("isOtpType", () => {
  it("accepts the three kinds of link we send", () => {
    expect(isOtpType("email")).toBe(true);
    expect(isOtpType("recovery")).toBe(true);
    expect(isOtpType("email_change")).toBe(true);
  });

  it("rejects deprecated spellings and anything else a stranger can type, so they never reach verifyOtp", () => {
    expect(isOtpType("signup")).toBe(false);
    expect(isOtpType("magiclink")).toBe(false);
    expect(isOtpType("invite")).toBe(false);
    expect(isOtpType("EMAIL")).toBe(false);
    expect(isOtpType("email ")).toBe(false);
    expect(isOtpType("../evil")).toBe(false);
    expect(isOtpType("constructor")).toBe(false);
    expect(isOtpType("")).toBe(false);
    expect(isOtpType(null)).toBe(false);
    expect(isOtpType(undefined)).toBe(false);
  });
});

describe("pickBranch", () => {
  it("reads an email link", () => {
    expect(pickBranch(at("?token_hash=abc&type=recovery"))).toEqual({
      kind: "hash",
      tokenHash: "abc",
      type: "recovery",
    });
  });

  it("reads a Google link", () => {
    expect(pickBranch(at("?code=xyz"))).toEqual({ kind: "code", code: "xyz" });
  });

  it("prefers the email branch, since it has to work on a device that has never seen this site", () => {
    expect(pickBranch(at("?token_hash=abc&type=email&code=xyz")).kind).toBe(
      "hash",
    );
  });

  it("treats a hash with a type we don't send as malformed, not an invitation to try PKCE", () => {
    expect(pickBranch(at("?token_hash=abc&type=signup")).kind).toBe("none");
    expect(pickBranch(at("?token_hash=abc")).kind).toBe("none");
  });

  it("has nothing to redeem when neither param is present", () => {
    expect(pickBranch(at("")).kind).toBe("none");
    expect(pickBranch(at("?next=%2Fapp")).kind).toBe("none");
  });
});
