import { MAX_FILE_BYTES } from "@/libs/browser/avatarImage";
import { uuid } from "@/libs/algorithms/uuid";

/**
 * A photo of the club, on its way to Supabase Storage.
 *
 * The one image in this app that is *not* a data URI in a text column. An
 * avatar is 40 KB and a logo 80 KB, which a row carries happily; a gallery of
 * eight venue photos is a couple of megabytes, and `clubs` is read by the
 * directory (24 rows) and the map pins (up to 500). That is the line
 * libs/browser/avatarImage.ts already predicted in its own note.
 *
 * So: a Blob, not a string. Still shrunk here rather than server-side, for the
 * same reason as the other two — the club's tablet is often on a phone tether,
 * and uploading 6 MB from a camera roll to throw most of it away is the slow
 * part of the interaction.
 *
 * No cropping. A logo is centre-cropped to a square because it renders in a
 * square; a venue photo is whatever shape the room is, and cropping it blind
 * cuts the far end off a long room. The carousel letterboxes instead.
 */

/** Long edge. Enough for a full-width header on a 2x phone and a card on a
 *  desktop; past this the extra pixels only cost upload time. */
const MAX_EDGE = 1600;

/** Quality steps, tried in order until one fits the budget. The first is
 *  indistinguishable from the source at this size; the last is visibly soft but
 *  still better than refusing a photo somebody wants to publish. */
const QUALITIES = [0.82, 0.7, 0.55, 0.4];

const MAX_OUT_BYTES = 300 * 1024;

export { MAX_FILE_BYTES };

/**
 * Decode → downscale the long edge → JPEG at the first quality that fits.
 *
 * JPEG, not PNG: this is a photograph, which is what JPEG is for. Transparency
 * is not a case — a camera does not produce it — so the reason logoImage.ts
 * avoids JPEG does not apply.
 *
 * Throws on a file that is not an image, or one that will not compress. Callers
 * toast; there is nothing to fall back to.
 */
export async function toPhotoBlob(file: File): Promise<Blob> {
  if (file.size > MAX_FILE_BYTES) throw new Error("file too large");

  const bitmap = await createImageBitmap(file, {
    // Phones write orientation into EXIF rather than rotating the pixels, so
    // without this a photo taken in portrait uploads on its side.
    imageOrientation: "from-image",
  });

  try {
    // Only ever down. A small photo stays its own size rather than being
    // upscaled into a bigger file with no more detail in it.
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of QUALITIES) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (blob && blob.size <= MAX_OUT_BYTES) return blob;
    }
    throw new Error("image will not compress");
  } finally {
    bitmap.close();
  }
}

/**
 * Where a club's photos live. The folder is what every storage policy
 * authorises on, and the millisecond prefix is what makes a plain name sort
 * chronological — see sql/club-photos.sql.
 */
export const clubPhotoFolder = (clubId: number) => `club-${clubId}`;

// uuid(), not crypto.randomUUID: that one is secure-context only and is simply
// absent on a tablet opening the app over plain http — see libs/algorithms/uuid.ts.
export const clubPhotoPath = (clubId: number) =>
  `${clubPhotoFolder(clubId)}/${Date.now()}-${uuid()}.jpg`;
