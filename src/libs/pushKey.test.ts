import { describe, expect, it } from "vitest";
import { toKeyBytes } from "./pushKey";

describe("toKeyBytes", () => {
  it("decodes a real VAPID public key to 65 bytes starting 0x04", () => {
    // A real VAPID public key: 65 bytes, uncompressed P-256 point, so it must
    // start with 0x04. This is the shape a wrong padding or a missed
    // character swap breaks.
    const key =
      "BK2nDbHrBzGOIwYb8_DpNejxdTGN8XpNOOwLIMG0JyMO1rm5XB9T93TgWnj8JaYDzoJkYf2FAI6GzcLyAHzwG1w";
    const bytes = toKeyBytes(key);

    expect(bytes.length, "a P-256 public key is 65 bytes").toBe(65);
    expect(bytes[0], "uncompressed point marker").toBe(0x04);
  });

  it("maps base64url - and _ to + and /, rather than dropping them", () => {
    // 0xfb 0xff round-trips through both of them.
    expect([...toKeyBytes("-_8")]).toEqual([251, 255]);
  });
});
