/**
 * Self-check for the hidden-feature path guard. No test runner in this project:
 *   node src/libs/features.check.ts
 */
import assert from "node:assert/strict";
import { DRILLS_ENABLED, isHiddenPath } from "./features.ts";

// Only meaningful while the feature is off — flipping the flag flips every case.
if (!DRILLS_ENABLED) {
  // Both halves of the feature, public and club-scoped
  assert.equal(isHiddenPath("/drills"), true);
  assert.equal(isHiddenPath("/drills/12"), true);
  assert.equal(isHiddenPath("/app/acme/drills"), true);
  assert.equal(isHiddenPath("/app/acme/drills/12/edit"), true);
  assert.equal(isHiddenPath("/app/acme/players/7/training"), true);
  assert.equal(isHiddenPath("/app/acme/players/7/training/plan"), true);
  assert.equal(isHiddenPath("/app/acme/me/training/plan"), true);

  // Whole segments only: a club named after the word keeps working
  assert.equal(isHiddenPath("/app/drills-r-us"), false);
  assert.equal(isHiddenPath("/app/acme/trainings"), false);
  assert.equal(isHiddenPath("/app/acme/ranking"), false);
  assert.equal(isHiddenPath("/"), false);
}

console.log("features: ok");
