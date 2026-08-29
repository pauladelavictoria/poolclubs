/**
 * Self-check for /auth/callback's query reading. No test runner in this
 * project: node src/libs/callbackParams.check.ts
 */
import assert from "node:assert/strict";
import { isOtpType, pickBranch } from "./callbackParams.ts";

const at = (query: string) =>
  new URL(`https://poolclubs.app/auth/callback${query}`);

// The three kinds of link we send.
assert.equal(isOtpType("email"), true);
assert.equal(isOtpType("recovery"), true);
assert.equal(isOtpType("email_change"), true);

// Deprecated spellings and anything else a stranger can type. These must never
// reach verifyOtp.
assert.equal(isOtpType("signup"), false);
assert.equal(isOtpType("magiclink"), false);
assert.equal(isOtpType("invite"), false);
assert.equal(isOtpType("EMAIL"), false);
assert.equal(isOtpType("email "), false);
assert.equal(isOtpType("../evil"), false);
assert.equal(isOtpType("constructor"), false);
assert.equal(isOtpType(""), false);
assert.equal(isOtpType(null), false);
assert.equal(isOtpType(undefined), false);

// An email link.
assert.deepEqual(pickBranch(at("?token_hash=abc&type=recovery")), {
  kind: "hash",
  tokenHash: "abc",
  type: "recovery",
});

// Google.
assert.deepEqual(pickBranch(at("?code=xyz")), { kind: "code", code: "xyz" });

// The email branch wins: it is the one that has to work on a device that has
// never seen this site.
assert.equal(
  pickBranch(at("?token_hash=abc&type=email&code=xyz")).kind,
  "hash",
);

// A hash with a type we don't send is malformed, not an invitation to try PKCE.
assert.equal(pickBranch(at("?token_hash=abc&type=signup")).kind, "none");
assert.equal(pickBranch(at("?token_hash=abc")).kind, "none");

// Nothing to redeem.
assert.equal(pickBranch(at("")).kind, "none");
assert.equal(pickBranch(at("?next=%2Fapp")).kind, "none");

console.log("callbackParams: ok");
