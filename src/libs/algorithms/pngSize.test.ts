import { describe, expect, it } from "vitest";
import { pngSize } from "./pngSize";

/** A PNG header is all pngSize reads, so a header is all a fixture needs. */
function pngHeader(width: number, height: number): string {
  const buf = Buffer.alloc(24);
  buf.write("\x89PNG\r\n\x1a\n", 0, "binary");
  buf.write("IHDR", 12, "ascii");
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf.toString("base64");
}

describe("pngSize", () => {
  it("reads the dimensions out of IHDR", () => {
    expect(pngSize(pngHeader(144, 144))).toBe("144x144");
    expect(pngSize(pngHeader(512, 256))).toBe("512x256");
  });

  it("refuses a JPEG, whatever its data URI claimed", () => {
    // JFIF magic, which is what demo-club.sql had stored as image/png. Read as
    // a PNG this used to yield "6291456x4292935808".
    const jpeg = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.alloc(32),
    ]);
    expect(pngSize(jpeg.toString("base64"))).toBeNull();
  });

  it("refuses bytes too short to hold a header", () => {
    expect(pngSize(Buffer.alloc(20).toString("base64"))).toBeNull();
    expect(pngSize("")).toBeNull();
  });
});
