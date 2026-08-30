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

/**
 * Long edges to try, in order. 1600 is enough for a full-width header on a 2x
 * phone and a card on a desktop; the rest are the way down.
 *
 * Stepping the *size* and not only the quality is the whole point, and it is
 * what logoImage.ts already does. A quality-only ladder does not converge: a
 * busy room with a lot of texture is still over budget at 1600px and quality
 * 0.4, and the only honest thing left to do at that point is refuse a photo
 * somebody legitimately picked. Fewer pixels always gets there.
 */
const SIZES = [1600, 1200, 900];

/** Tried innermost, at each size. 0.82 is indistinguishable from the source
 *  here; 0.55 is soft but publishable. */
const QUALITIES = [0.82, 0.7, 0.55];

const MAX_OUT_BYTES = 300 * 1024;

/**
 * Input cap, and deliberately not avatarImage's 8 MB.
 *
 * A 48-megapixel phone photo is routinely over 8 MB, and this is the one place
 * in the app somebody uploads a real camera photo rather than a face or a mark
 * — so borrowing the avatar's cap rejected ordinary files. The number that
 * matters downstream is the *output* budget above, which is unaffected by how
 * big the source was.
 *
 * There is still a cap, because `createImageBitmap` decodes the whole thing
 * into memory and the club's tablet is not a workstation.
 */
export const MAX_PHOTO_FILE_BYTES = 25 * 1024 * 1024;

/** Thrown for a file that is too big to decode, as opposed to one that failed
 *  for any other reason. The caller tells the two apart so it can say which. */
export class PhotoTooLargeError extends Error {
  constructor() {
    super("file too large");
    this.name = "PhotoTooLargeError";
  }
}

/** The size an image becomes when its long edge is capped. Only ever down —
 *  a small photo stays its own size rather than being upscaled into a bigger
 *  file with no more detail in it. Pure, so it is the part under test. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

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
  if (file.size > MAX_PHOTO_FILE_BYTES) throw new PhotoTooLargeError();

  const bitmap = await createImageBitmap(file, {
    // Phones write orientation into EXIF rather than rotating the pixels, so
    // without this a photo taken in portrait uploads on its side.
    imageOrientation: "from-image",
  });

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");

    let smallest: Blob | null = null;

    for (const edge of SIZES) {
      const { width, height } = fitWithin(bitmap.width, bitmap.height, edge);
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);

      for (const quality of QUALITIES) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", quality),
        );
        if (!blob) continue;
        if (blob.size <= MAX_OUT_BYTES) return blob;
        smallest = blob;
      }
    }

    // Every combination was over budget, which for a photograph means the
    // source was pathological rather than merely large. The smallest attempt is
    // still the smallest thing we can make of it, and the bucket's own 1 MB
    // limit is the backstop — so hand it over rather than refusing outright.
    if (smallest && smallest.size <= 1024 * 1024) return smallest;
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
