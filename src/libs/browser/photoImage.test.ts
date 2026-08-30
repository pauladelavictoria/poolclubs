/**
 * The scaling maths. `toPhotoBlob` itself needs a canvas, so — as in
 * avatarImage.test.ts — only the pure part is tested here.
 */
import { describe, expect, it } from "vitest";
import { fitWithin } from "./photoImage";

describe("fitWithin", () => {
  it("caps the long edge and keeps the aspect ratio", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("never upscales — a small photo stays its own size", () => {
    // Otherwise a 600px photo becomes a bigger file with no more detail in it.
    expect(fitWithin(600, 400, 1600)).toEqual({ width: 600, height: 400 });
    expect(fitWithin(1600, 1200, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it("keeps a very wide panorama at least one pixel tall", () => {
    // A canvas of height 0 throws, and a phone panorama is exactly this shape.
    const { height } = fitWithin(20000, 300, 900);
    expect(height).toBeGreaterThanOrEqual(1);
  });

  it("steps down consistently, which is what makes the ladder converge", () => {
    const sizes = [1600, 1200, 900].map(
      (edge) => fitWithin(4000, 3000, edge).width,
    );
    expect(sizes).toEqual([1600, 1200, 900]);
  });
});
