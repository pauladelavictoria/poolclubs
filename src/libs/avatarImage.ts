/**
 * Avatars are stored as data URIs in `players.avatar_url` — no bucket, no
 * storage policies, no signed URLs, no orphan cleanup. That only works because
 * the picture is shrunk to a thumbnail first: SIZE² JPEG lands around 4–8 KB,
 * which is the same order as the OAuth URLs already in that column.
 *
 * ponytail: data URI in a TEXT column. Move to Supabase Storage if avatars ever
 * need to be bigger than a face in a list row — the ranking query pulls every
 * player's avatar_url, so row size is paid on every fetch.
 */

/** Displayed at 28–64px; 128 covers 2× screens with room to spare. */
const SIZE = 128;
/** Refuse a source file this big before decoding it. */
export const MAX_FILE_BYTES = 8 * 1024 * 1024;
/** A data URI past this would bloat every players query. */
const MAX_OUT_BYTES = 40 * 1024;

/**
 * The source rectangle for a centre crop: the largest square that fits, taken
 * from the middle. Portrait photos keep the face, not the ceiling.
 */
export function squareCrop(width: number, height: number) {
  const side = Math.min(width, height);
  return {
    sx: (width - side) / 2,
    sy: (height - side) / 2,
    side,
  };
}

/** Decode → centre-crop → downscale → JPEG data URI. Throws on a non-image. */
export async function toAvatarDataUrl(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error("file too large");

  // `from-image` applies EXIF orientation, so phone photos are not sideways.
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const { sx, sy, side } = squareCrop(bitmap.width, bitmap.height);

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();

  // Noisy photos can still come out fat at 0.7. Step down rather than reject.
  for (const quality of [0.7, 0.5, 0.35]) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= MAX_OUT_BYTES) return url;
  }
  throw new Error("image will not compress");
}
