import { squareCrop, MAX_FILE_BYTES } from "@/libs/avatarImage";

/**
 * A club logo, stored the same way an avatar is: a data URI in
 * `clubs.logo_url`, no bucket. See libs/avatarImage.ts for why that's fine at
 * this size.
 *
 * PNG, not JPEG: a logo is flat shapes and text, which JPEG's block
 * compression rings and smears, and plenty of logos are transparent to begin
 * with — flattening that to black the way JPEG would is worse than a bigger
 * file. Without a quality knob to lean on, the size budget is met by
 * downscaling instead.
 */
const SIZES = [256, 192, 144, 112];
const MAX_LOGO_OUT_BYTES = 80 * 1024;

export { MAX_FILE_BYTES };

/** Decode → centre-crop → downscale until it fits → PNG data URI. Throws on
 *  a non-image. */
export async function toLogoDataUrl(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error("file too large");

  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const { sx, sy, side } = squareCrop(bitmap.width, bitmap.height);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");

  try {
    for (const size of SIZES) {
      canvas.width = size;
      canvas.height = size;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
      const url = canvas.toDataURL("image/png");
      if (url.length <= MAX_LOGO_OUT_BYTES) return url;
    }
    throw new Error("image will not compress");
  } finally {
    bitmap.close();
  }
}
