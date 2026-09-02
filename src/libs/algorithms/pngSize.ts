/**
 * How big a stored logo actually is, for a web app manifest's `icons[].sizes`.
 *
 * A club logo lives in `clubs.logo_url` as a data URI (see
 * libs/browser/logoImage.ts), and that URI carries its own `image/png` label —
 * but the label has been wrong. demo-club.sql stored a JPEG under it, the IHDR
 * read below picked up whatever sat at those offsets, and the manifest went out
 * claiming `sizes: "6291456x4292935808"`. Chrome does not report an icon it
 * finds absurd, it silently drops it, so the club got the default PoolClubs
 * ball and nothing anywhere explained why.
 *
 * Hence: trust the bytes, not the label.
 */

/** PNG signature bytes 1-3, the part that spells the format in ASCII. */
const PNG_MAGIC = "PNG";

/** IHDR is the first chunk, so width and height sit at fixed offsets. */
const WIDTH_OFFSET = 16;
const HEIGHT_OFFSET = 20;
const HEADER_BYTES = 24;

/**
 * `"<width>x<height>"` from a base64 PNG, or null if these bytes are not a PNG.
 *
 * ponytail: PNG only. Everything the app itself stores is PNG — logoImage.ts
 * encodes through `canvas.toDataURL("image/png")` and has no other path — so a
 * JPEG or WebP here means hand-written data, and null (no icon, fall back)
 * is the right answer for it rather than a reason to carry two more parsers.
 * Upgrade path if uploads ever accept another format: read its header too.
 */
export function pngSize(base64: string): string | null {
  const buf = Buffer.from(base64, "base64");

  if (buf.length < HEADER_BYTES) return null;
  if (buf.subarray(1, 4).toString() !== PNG_MAGIC) return null;

  return `${buf.readUInt32BE(WIDTH_OFFSET)}x${buf.readUInt32BE(HEIGHT_OFFSET)}`;
}
