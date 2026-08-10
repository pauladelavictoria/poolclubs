/**
 * Self-check for the avatar crop maths. No test runner in this project:
 *   node src/libs/avatarImage.check.ts
 * (toAvatarDataUrl itself needs a canvas, so only the pure part is checked.)
 */
import assert from "node:assert/strict";
import { squareCrop } from "./avatarImage.ts";

// Already square: nothing is thrown away
assert.deepEqual(squareCrop(200, 200), { sx: 0, sy: 0, side: 200 });

// Landscape: full height, centred horizontally
assert.deepEqual(squareCrop(400, 200), { sx: 100, sy: 0, side: 200 });

// Portrait: full width, centred vertically
assert.deepEqual(squareCrop(200, 500), { sx: 0, sy: 150, side: 200 });

// Odd sizes land on a half pixel rather than drifting off-centre
assert.deepEqual(squareCrop(101, 100), { sx: 0.5, sy: 0, side: 100 });

console.log("avatarImage: ok");
