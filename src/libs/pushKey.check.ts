/**
 * Self-check for toKeyBytes. No test runner in this project:
 *   node src/libs/pushKey.check.ts
 */
import assert from "node:assert/strict";
import { toKeyBytes } from "./pushKey.ts";

// A real VAPID public key: 65 bytes, uncompressed P-256 point, so it must start
// with 0x04. This is the shape a wrong padding or a missed character swap breaks.
const key =
  "BK2nDbHrBzGOIwYb8_DpNejxdTGN8XpNOOwLIMG0JyMO1rm5XB9T93TgWnj8JaYDzoJkYf2FAI6GzcLyAHzwG1w";
const bytes = toKeyBytes(key);

assert.equal(bytes.length, 65, "a P-256 public key is 65 bytes");
assert.equal(bytes[0], 0x04, "uncompressed point marker");

// "-" and "_" must map to "+" and "/", not be dropped. 0xfb 0xff round-trips
// through both of them.
assert.deepEqual([...toKeyBytes("-_8")], [251, 255]);

console.log("pushKey ok");
