import { useState } from "react";
import { SectionHead } from "@/components/ui/SectionHead";
import { type ClubPhoto } from "@/queries/clubPhotos";
import { useT } from "@/i18n";
import { PhotoLightbox } from "./PhotoLightbox";

/**
 * The venue itself, if the club has published any pictures of it.
 *
 * Renders nothing at all when there are none — the info tab's own empty line
 * covers the club that has published nothing.
 *
 * The same CSS scroll-snap strip the tabs and the roster use rather than a
 * carousel dependency: it is four utility classes, it works with a thumb, a
 * trackpad and a keyboard, and it degrades to a plain scrolling row with no JS.
 */
export function ClubPhotos({ photos }: { photos: ClubPhoto[] }) {
  const { t } = useT();
  const [open, setOpen] = useState<number | null>(null);

  // The cover is already the hero's banner, so it doesn't get a second
  // thumbnail here — but it stays in `photos` for the lightbox, one arrow
  // key left of the first thumbnail (index 1 there, index 0 in `photos`).
  const strip = photos.slice(1);
  if (strip.length === 0) return null;

  return (
    <section className="mt-8">
      <SectionHead title={t("public.publicClub.photos")} />
      {/* py-2, not pb-1: `overflow-x: auto` clips vertically too, so the 3px a
          card rises on hover — and the shadow above it — was cut off against
          the top edge of the scroller. */}
      <div className="no-bar -mx-4 mt-2 flex snap-x gap-3 overflow-x-auto px-4 py-2 sm:-mx-6 sm:px-6">
        {strip.map((photo, i) => (
          <button
            key={photo.path}
            type="button"
            onClick={() => setOpen(i + 1)}
            aria-label={t("public.publicClub.viewPhoto", { n: String(i + 1) })}
            className="lift shrink-0 snap-start overflow-hidden rounded-card border border-hairline bg-felt-raised"
          >
            <img
              src={photo.url}
              alt=""
              // The first is what the page opens on, so it is the one image
              // here worth blocking layout for; the rest are a scroll away.
              loading={i === 0 ? "eager" : "lazy"}
              className="h-48 w-auto max-w-[85vw] object-cover sm:h-64"
            />
          </button>
        ))}
      </div>

      <PhotoLightbox
        photos={photos}
        index={open}
        onClose={() => setOpen(null)}
        onIndex={setOpen}
      />
    </section>
  );
}
