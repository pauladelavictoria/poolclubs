import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { LuTrash2 } from "react-icons/lu";
import { supabase } from "@/libs/supabase/browser";
import { useAuth } from "@/hooks/useAuth";
import { keys } from "@/libs/queryKeys";
import {
  CLUB_PHOTOS_BUCKET,
  MAX_CLUB_PHOTOS,
  clubPhotosQuery,
} from "@/queries/clubPhotos";
import { clubPhotoPath, toPhotoBlob } from "@/libs/browser/photoImage";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";

/**
 * The club's venue photos.
 *
 * Unlike every other control on the settings page this one saves itself rather
 * than staging into the form — the same split AvatarUpload and ClubLogoUpload
 * already sit either side of. A logo is one value on the club row and belongs
 * in the row's one Save; a photo is a file in a bucket, and there is no row
 * being written to carry it. Staging would mean holding Blobs in React state
 * until an unrelated button is pressed, and an upload that only happens if you
 * remember to press Save is an upload people lose.
 *
 * ponytail: no reordering and no captions. Chronological is an order, and the
 * ceiling is written down in sql/club-photos.sql along with what to do about it.
 */
export default function ClubPhotosUpload({ disabled }: { disabled?: boolean }) {
  const { t } = useT();
  const { activeClubId } = useAuth();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const { data: photos = [] } = useQuery(clubPhotosQuery(activeClubId));
  const full = photos.length >= MAX_CLUB_PHOTOS;

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: keys.clubPhotos.all });

  const remove = useMutation({
    mutationFn: async (path: string) => {
      const { error } = await supabase.storage
        .from(CLUB_PHOTOS_BUCKET)
        .remove([path]);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: () => toast.error(t("club.photos.removeError")),
  });

  const add = async (files: FileList | null) => {
    if (!files?.length || activeClubId == null) return;
    setBusy(true);
    try {
      // Only as many as there is room for. Silently taking the first few of a
      // ten-photo selection would look like a failure, so say what happened.
      const room = MAX_CLUB_PHOTOS - photos.length;
      const picked = [...files].slice(0, room);
      if (picked.length < files.length) toast.info(t("club.photos.limit"));

      // Sequential, not Promise.all: the name carries a millisecond timestamp
      // and that is what orders the gallery, so uploading in the order they
      // were picked is what makes the order predictable. Also gentler on a
      // phone tether, which is where this gets used.
      for (const file of picked) {
        const blob = await toPhotoBlob(file);
        const { error } = await supabase.storage
          .from(CLUB_PHOTOS_BUCKET)
          .upload(clubPhotoPath(activeClubId), blob, {
            contentType: "image/jpeg",
          });
        if (error) throw error;
      }
      await refresh();
    } catch {
      toast.error(t("club.photos.addError"));
    } finally {
      setBusy(false);
      // Same file picked twice in a row still fires a change event.
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((photo) => (
            <li
              key={photo.path}
              className="group relative aspect-[4/3] overflow-hidden rounded-card border border-hairline bg-felt-raised"
            >
              <img
                src={photo.url}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                disabled={disabled || remove.isPending}
                aria-label={t("club.photos.remove")}
                onClick={() => remove.mutate(photo.path)}
                // Always visible rather than on hover: the settings page is
                // used on the club's tablet as much as on a desktop, and a
                // control that needs a pointer is a control a tablet cannot
                // reach.
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-control bg-pocket/90 text-ink-soft transition-colors duration-150 hover:text-ink"
              >
                <LuTrash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => add(e.target.files)}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={busy || full || disabled}
        onClick={() => input.current?.click()}
      >
        {busy ? t("club.photos.uploading") : t("club.photos.add")}
      </Button>
      <p className="text-caption text-ink-faint">
        {t("club.photos.count", {
          n: String(photos.length),
          max: String(MAX_CLUB_PHOTOS),
        })}
      </p>
    </div>
  );
}
