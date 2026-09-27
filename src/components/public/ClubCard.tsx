import { cardClasses } from "@/components/ui/cardStyles";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LuMapPin } from "react-icons/lu";
import { Avatar } from "@/components/ui/Avatar";
import { type PublicClubCard } from "@/queries/public/clubs";
import { clubPhotosQuery } from "@/queries/clubPhotos";
import { orderPhotos } from "@/libs/algorithms/photoOrder";
import { useT } from "@/i18n";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const isNew = (createdAt: string | null) =>
  createdAt !== null &&
  Date.now() - new Date(createdAt).getTime() < THIRTY_DAYS_MS;

/**
 * The club's own venue if it has published one, and the accent if it has not:
 * a short band, the logo straddling its lower edge, and the two facts a
 * directory reader wants.
 *
 * The band is a fixed height rather than an aspect ratio, so a card does not get
 * taller as the grid gets wider — a directory is something you scan down, and
 * every row of it should cost the same amount of screen.
 *
 * ponytail: one storage list() per card, because the bucket is the photo list
 * and there is no cover column to read (see queries/clubPhotos). At a page of
 * 24 that is 24 cheap parallel requests against a public bucket, cached under
 * the same key the club's own page uses — so clicking a card is already warm.
 * If the directory ever gets long enough for that to matter, the fix is a
 * clubs.cover_url column written at upload time, not a batching layer here.
 */
export function ClubCard({ club }: { club: PublicClubCard }) {
  const { t } = useT();
  // Reconciled against the bucket and against the club's stored order, so the
  // card's picture is the same one the club's own hero leads with.
  const { data: photos = [] } = useQuery(clubPhotosQuery(club.id));
  const cover = orderPhotos(photos, club.photo_order)[0] ?? null;
  const place = [club.city, club.country].filter(Boolean).join(", ");

  return (
    <Link
      to="/clubs/$slug"
      params={{ slug: club.slug }}
      className={cardClasses({ className: "lift group block overflow-hidden" })}
    >
      {/* The venue if there is one, and a drawn pool hall if not.

          The fallback was the club's colour at full strength once; on one
          accent that would be a yellow strip on every photo-less club, in the
          exact colour this app reserves for "act". Bare felt-raised replaced
          it and was worse in a different way: a flat rectangle where every
          neighbouring card has a photograph reads as an image that failed to
          load, not as a club that has not uploaded one.

          One file for every such club and both themes. It is flat vector art,
          so it cannot be mistaken for somebody's actual room, and it is dimmed
          per theme (see .venue-fallback) so a club that did upload a photo
          always wins the grid. */}
      <div className="relative h-36 overflow-hidden bg-felt-raised">
        <img
          src={cover ? cover.url : "/art/venue-fallback.webp"}
          // Decorative either way: the club's name is the heading right below
          // it, and a description here would be read out before the name.
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover ${
            cover ? "" : "venue-fallback"
          }`}
        />
        {isNew(club.created_at) && (
          <span className="flood absolute top-2.5 left-2.5 rounded-full px-2 py-0.5 font-mono text-caption font-semibold">
            {t("public.publicClubs.new")}
          </span>
        )}
      </div>

      {/* `relative` is load-bearing, not decoration. The band above is positioned
          (it has to be, for the New pill), so it paints in the positioned layer,
          above every non-positioned sibling — which clipped the top half of the
          logo overlapping it. Positioning this too puts it back on top, later in
          document order. It only looked fine for clubs with no logo, because the
          fallback's bg-felt-raised is near enough the band to hide the cut. */}
      <div className="relative px-4 pb-4">
        {/* `flex w-fit`, never `inline-flex`. An inline-level flex box is aligned
            on its baseline, and a flex container takes the baseline of its first
            item — which is real text for the initial fallback and nothing at all
            for an <img>. That put the two kinds of logo on different lines by a
            few pixels. Block-level takes it out of the line box entirely. */}
        <div className="-mt-8 flex w-fit rounded-full bg-felt p-1">
          <Avatar
            name={club.name}
            url={club.logo_url}
            mark
            className="h-14 w-14"
          />
        </div>
        <h3 className="mt-3 truncate text-h4 font-semibold text-ink transition-colors duration-150 group-hover:text-strike">
          {club.name}
        </h3>
        {/* Where it is, in the reader's order: the city first, the country only
            as the thing that disambiguates it. Both are optional columns, so
            the line is skipped rather than left as an empty row. */}
        {place && (
          <p className="mt-1 flex items-center gap-1.5 text-caption text-ink-soft">
            <LuMapPin
              className="h-3.5 w-3.5 shrink-0 text-ink-faint"
              aria-hidden
            />
            <span className="truncate">{place}</span>
          </p>
        )}
        <p className="mt-1 font-mono text-caption tabular-nums text-ink-faint">
          {t("public.publicClubs.members", { n: club.member_count })}
        </p>
      </div>
    </Link>
  );
}
