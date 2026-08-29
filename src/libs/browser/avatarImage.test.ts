/**
 * The avatar crop maths. `toAvatarDataUrl` itself needs a canvas, so only the
 * pure part is tested here.
 */
import { describe, expect, it } from "vitest";
import { squareCrop } from "./avatarImage";

describe("squareCrop", () => {
  it("already square: nothing is thrown away", () => {
    expect(squareCrop(200, 200)).toEqual({ sx: 0, sy: 0, side: 200 });
  });

  it("landscape: full height, centred horizontally", () => {
    expect(squareCrop(400, 200)).toEqual({ sx: 100, sy: 0, side: 200 });
  });

  it("portrait: full width, centred vertically", () => {
    expect(squareCrop(200, 500)).toEqual({ sx: 0, sy: 150, side: 200 });
  });

  it("odd sizes land on a half pixel rather than drifting off-centre", () => {
    expect(squareCrop(101, 100)).toEqual({ sx: 0.5, sy: 0, side: 100 });
  });
});
