import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";
import { clubPhotoFolder } from "@/libs/browser/photoImage";

export const CLUB_PHOTOS_BUCKET = "club-photos";

/** How many a club may publish. Not a database constraint — storage has no way
 *  to express one — so it is enforced where the upload happens and stated here
 *  so the gallery and the uploader agree on the number. */
export const MAX_CLUB_PHOTOS = 8;

export type ClubPhoto = {
  /** The object key, which is also its identity for deletion. */
  path: string;
  /** Ready to put in an <img src>. A public bucket, so no signing and no
   *  expiry — see the warning in sql/club-photos.sql. */
  url: string;
};

/**
 * A club's venue photos, oldest first.
 *
 * There is no `club_photos` table: the bucket is the list. Ordering comes from
 * the millisecond prefix in the object name, which is why sorting by `name`
 * ascending is chronological — see src/libs/browser/photoImage.ts and the note
 * in sql/club-photos.sql about why a table would only be a second source of
 * truth to disagree with this one.
 *
 * Whether a stranger may see the list at all is decided by RLS on
 * storage.objects, not here: the policy allows listing a public club's folder,
 * or any club a member belongs to. A club that is neither comes back empty
 * rather than erroring, which is what the gallery wants — an empty gallery
 * renders as nothing, and a visitor is owed no explanation.
 */
export const clubPhotosQuery = (clubId: number | null | undefined) =>
  queryOptions({
    queryKey: keys.clubPhotos.in(clubId),
    queryFn: async (): Promise<ClubPhoto[]> => {
      const supabase = getSupabase();
      const bucket = supabase.storage.from(CLUB_PHOTOS_BUCKET);

      const { data, error } = await bucket.list(clubPhotoFolder(clubId!), {
        limit: MAX_CLUB_PHOTOS,
        sortBy: { column: "name", order: "asc" },
      });

      // Deliberately swallowed. The bucket may not exist yet on a checkout that
      // has not applied sql/club-photos.sql, and a club page is not the place to
      // report that — the gallery is an enhancement and its absence is a
      // non-event. A genuine failure shows up as no photos, which is also what
      // a club with no photos looks like.
      if (error || !data) return [];

      return data
        // list() returns a placeholder row for the folder itself on some
        // backends; a real object always has an id.
        .filter((object) => object.id !== null)
        .map((object) => {
          const path = `${clubPhotoFolder(clubId!)}/${object.name}`;
          return { path, url: bucket.getPublicUrl(path).data.publicUrl };
        });
    },
    enabled: clubId != null,
    // Photos change when an admin changes them, which is rarely and never while
    // somebody is looking at the public page.
    staleTime: 5 * 60_000,
  });
