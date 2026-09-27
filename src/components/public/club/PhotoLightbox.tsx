import { LuX } from "react-icons/lu";
import { type ClubPhoto } from "@/queries/clubPhotos";
import { useDialog, useLingering } from "@/hooks/useDialog";
import { useT } from "@/i18n";

/**
 * One photo, big.
 *
 * A native <dialog> via useDialog, which is where the backdrop, Esc-to-close,
 * the focus trap and the inertness of the page behind all come from for free —
 * see the hook. A div with a fixed overlay would hand-roll four things and get
 * at least one of them wrong.
 *
 * ponytail: no zoom, no pinch, no swipe. Arrows and Esc, on a picture of a pool
 * room. A gallery library is a lot of kilobytes for eight photos.
 */
export function PhotoLightbox({
  photos,
  index,
  onClose,
  onIndex,
}: {
  photos: ClubPhoto[];
  index: number | null;
  onClose: () => void;
  onIndex: (index: number) => void;
}) {
  const { t } = useT();
  const ref = useDialog(index !== null);
  // Kept through the close animation — see useLingering.
  const shownIndex = useLingering(index);
  const photo = shownIndex === null ? null : photos[shownIndex];

  return (
    <dialog
      ref={ref}
      // The dialog's own close (Esc, or the backdrop) has to reach React, or
      // reopening the same photo does nothing because the state never cleared.
      onClose={onClose}
      onClick={(e) => {
        // Clicking the backdrop closes. The backdrop is the dialog element
        // itself, so this only fires when the click missed the content.
        if (e.target === ref.current) onClose();
      }}
      onKeyDown={(e) => {
        if (index === null) return;
        if (e.key === "ArrowRight" && index < photos.length - 1)
          onIndex(index + 1);
        if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      }}
      className="lightbox m-auto max-h-[92dvh] max-w-[95vw] overflow-hidden rounded-sheet border border-hairline bg-felt p-0 text-ink"
    >
      {photo && (
        <div className="relative">
          <img
            src={photo.url}
            alt=""
            className="max-h-[92dvh] max-w-[95vw] object-contain"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-control bg-pocket/90 text-ink-soft transition-colors duration-150 hover:text-ink"
          >
            <LuX className="h-5 w-5" aria-hidden />
          </button>
          {photos.length > 1 && (
            <p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-control bg-pocket/90 px-2 py-0.5 font-mono text-caption tabular-nums text-ink-soft">
              {shownIndex !== null ? shownIndex + 1 : 0} / {photos.length}
            </p>
          )}
        </div>
      )}
    </dialog>
  );
}
