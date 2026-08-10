/**
 * Self-check for drill edit permissions. No test runner in this project:
 *   node src/libs/drillPermissions.check.ts
 */
import assert from "node:assert/strict";
import { canEditDrill } from "./drillPermissions.ts";

const ME = "uuid-me";
const OTHER = "uuid-other";

// Creator edits their own drill
assert.equal(canEditDrill(ME, ME, false), true);
// ...and nobody else's
assert.equal(canEditDrill(OTHER, ME, false), false);
// Admin edits anything, including the seeded drills
assert.equal(canEditDrill(OTHER, ME, true), true);
assert.equal(canEditDrill(null, ME, true), true);
// Seeded drills (null owner) are closed to non-admins
assert.equal(canEditDrill(null, ME, false), false);
// Two unknowns must not match each other
assert.equal(canEditDrill(null, null, false), false);
assert.equal(canEditDrill(undefined, undefined, false), false);
// Signed out, never
assert.equal(canEditDrill(ME, null, false), false);

console.log("drillPermissions: ok");
