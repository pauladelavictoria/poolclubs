import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { LuChevronLeft, LuChevronRight, LuTrash2 } from "react-icons/lu";
import { supabase } from "@/libs/supabase/browser";
import { useAuth } from "@/hooks/useAuth";
import { keys } from "@/libs/queryKeys";
import {
  CLUB_PHOTOS_BUCKET,
  MAX_CLUB_PHOTOS,
  clubPhotosQuery,
} from "@/queries/clubPhotos";
import {
  MAX_PHOTO_FILE_BYTES,
  PhotoTooLargeError,
  clubPhotoPath,
  toPhotoBlob,
} from "@/libs/browser/photoImage";
import { Button } from "@/components/ui/Button";
import { moveItem, orderPhotos } from "@/libs/algorithms/photoOrder";
import { useManageClub } from "@/hooks/useClub";
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
  const { activeClub, activeClubId } = useAuth();
  const { updateClub } = useManageClub();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  /** Index being dragged, or null. Pointer drag only — see the note on the
   *  arrow buttons below for why it is not the only way to reorder. */
  const [dragging, setDragging] = useState<number | null>(null);

  const { data: stored = [] } = useQuery(clubPhotosQuery(activeClubId));
  // The bucket says what exists, the club row says in what order. Reconciled on
  // every read so neither store can strand the other — see photoOrder.ts.
  const photos = orderPhotos(stored, activeClub?.photo_order);
  const full = photos.length >= MAX_CLUB_PHOTOS;

  /** Persist a whole new sequence. Writing the reconciled list rather than
   *  patching the stored one is what prunes paths whose photos are gone. */
  const reorder = (from: number, to: number) => {
    const next = moveItem(photos, from, to);
    if (next === photos) return;
    updateClub.mutate(
      { photoOrder: next.map((photo) => photo.path) },
      { onError: () => toast.error(t("club.photos.orderError")) },
    );
  };

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
    } catch (err) {
      // One file too big to decode is a different problem from an upload that
      // failed, and it is the one the person can actually do something about.
      toast.error(
        err instanceof PhotoTooLargeError
          ? t("club.photos.tooLarge", {
              mb: String(Math.floor(MAX_PHOTO_FILE_BYTES / 1024 / 1024)),
            })
          : t("club.photos.addError"),
      );
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
          {photos.map((photo, i) => (
            <li
              key={photo.path}
              draggable={!disabled}
              onDragStart={() => setDragging(i)}
              onDragEnd={() => setDragging(null)}
              // preventDefault is what makes this a valid drop target at all;
              // without it the browser refuses the drop and nothing fires.
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragging !== null) reorder(dragging, i);
                setDragging(null);
              }}
              className={[
                "group relative aspect-[4/3] overflow-hidden rounded-card border bg-felt-raised",
                dragging === i ? "border-strike opacity-50" : "border-hairline",
              ].join(" ")}
            >
              <img
                src={photo.url}
                alt=""
                loading="lazy"
                // The image is the drag handle, and a browser's default is to
                // drag the picture itself rather than the tile around it.
                draggable={false}
                className="h-full w-full object-cover"
              />

              {/* The first photo leads the public page. Said out loud, because
                  "it is the one on the left" is not something anybody should
                  have to infer from a grid that wraps. */}
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded-control bg-strike px-1.5 py-0.5 text-caption font-medium text-pocket">
                  {t("club.photos.cover")}
                </span>
              )}

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

              {/* HTML5 drag events do not fire for touch, and this page is used
                  on the club's tablet. These are the same reorder by another
                  route — and they are also the whole of the keyboard and
                  screen-reader story, which drag alone has none of. */}
              <div className="absolute inset-x-1 bottom-1 flex justify-between">
                <Step
                  label={t("club.photos.moveEarlier")}
                  disabled={disabled || i === 0}
                  onClick={() => reorder(i, i - 1)}
                >
                  <LuChevronLeft className="h-3.5 w-3.5" aria-hidden />
                </Step>
                <Step
                  label={t("club.photos.moveLater")}
                  disabled={disabled || i === photos.length - 1}
                  onClick={() => reorder(i, i + 1)}
                >
                  <LuChevronRight className="h-3.5 w-3.5" aria-hidden />
                </Step>
              </div>
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

function Step({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-control bg-pocket/90 text-ink-soft transition-colors duration-150 hover:text-ink disabled:invisible"
    >
      {children}
    </button>
  );
}
