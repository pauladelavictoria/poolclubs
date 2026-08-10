/**
 * Self-check for the post-login redirect guard. No test runner in this project:
 *   node src/libs/nextPath.check.ts
 */
import assert from "node:assert/strict";
import { isSafePath, loginLink } from "./nextPath.ts";

// Same-site paths are the only thing allowed through
assert.equal(isSafePath("/drills/12"), true);
assert.equal(isSafePath("/drills/12?plan=3"), true);

// Anything that could leave the site is refused
assert.equal(isSafePath("//evil.com"), false);
assert.equal(isSafePath("/\\evil.com"), false);
assert.equal(isSafePath("https://evil.com"), false);
assert.equal(isSafePath("javascript:alert(1)"), false);
assert.equal(isSafePath("drills"), false);
assert.equal(isSafePath(""), false);
assert.equal(isSafePath(null), false);
assert.equal(isSafePath(undefined), false);

assert.equal(loginLink("/drills/12"), "/app/login?next=%2Fdrills%2F12");

console.log("nextPath: ok");
