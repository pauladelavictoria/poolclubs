import { useState } from "react";
import { headlineClasses } from "@/components/layout/publicTitleStyles";
import { useQuery } from "@tanstack/react-query";
import { LuMapPin } from "react-icons/lu";
import ShareButton from "@/components/social/ShareButton";
import { Avatar } from "@/components/ui/Avatar";
import { clubPhotosQuery } from "@/queries/clubPhotos";
import { orderPhotos } from "@/libs/algorithms/photoOrder";
import {
  type PublicClub,
  type PublicClubDetail,
  type PublicPlayer,
} from "@/queries/public/clubs";
import { useT } from "@/i18n";
import { ClubCta } from "./ClubCta";
import { PublicClubTabs } from "./PublicClubTabs";
import { PhotoLightbox } from "./PhotoLightbox";

/** The address as the page prints it. ClubTabEmpty for a club that never set one. */
const where = (club: PublicClub) =>
  [club.address, club.city].filter(Boolean).join(", ");

/**
 * Coordinates when the club has them, because those are a geocoder's answer and
 * the text is the question — "Sierra Billiards, Valencia" is a search Google can
 * get wrong, a lat/lon is not. The name goes in the text fallback so the pin
 * lands on the venue rather than on the middle of the street.
 */
const mapsUrl = (club: PublicClub) => {
  const query =
    club.lat != null && club.lon != null
      ? `${club.lat},${club.lon}`
      : [club.name, club.address, club.city, club.country]
          .filter(Boolean)
          .join(", ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

/**
 * Full-bleed, the Patreon creator-header shape: a cover band, the logo plate
 * overlapping it, the name at display size, the roster as the social-proof
 * line underneath. Rendered as a sibling of `PublicShell` rather than inside
 * it — that is what lets it bleed to the edges the shell's own measure would
 * otherwise clip.
 */
export function ClubHero({
  club,
  listed,
  url,
}: {
  club: PublicClubDetail;
  listed: PublicPlayer[];
  url: string;
}) {
  const { t } = useT();

  // The club's first photo, as the banner above the title. Absent for a club
  // that has published none, and the hero simply starts at the title. Same
  // order the info tab's gallery and the directory card use, so all three
  // agree about which photo leads.
  const { data: storedPhotos = [] } = useQuery(clubPhotosQuery(club.id));
  const orderedPhotos = orderPhotos(storedPhotos, club.photo_order);
  const cover = orderedPhotos[0] ?? null;
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="border-b border-hairline">
      {/* The venue as a banner, not as a backdrop.
          It used to sit behind the whole hero under a veil, which is a bargain
          that costs both sides: the photo is dimmed to the point of being
          texture, and the text still has to survive whatever was underneath it.
          In light mode it was worse — an 80% white veil over a bright room is a
          pale smear with no edge, and the title had nothing to sit against.
          Above the title instead, at full strength, with the title on the
          page's own surface. The photo gets to be a photograph and every ink
          token keeps the contrast it was measured for. */}
      {cover && (
        <button
          type="button"
          onClick={() => setOpen(0)}
          aria-label={t("public.publicClub.viewPhoto", { n: "1" })}
          className="relative block h-40 w-full overflow-hidden sm:h-56"
        >
          <img
            src={cover.url}
            // Decorative: the club's name is the heading directly below.
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
          />
        </button>
      )}

      <PhotoLightbox
        photos={orderedPhotos}
        index={open}
        onClose={() => setOpen(null)}
        onIndex={setOpen}
      />
      {/* `relative` is load-bearing, not decoration. The banner above is
          positioned (it has to be, to clip the photo), so it paints in the
          positioned layer above every non-positioned sibling — which cut off
          the top of the avatar straddling it. Positioning this too puts it
          back on top, later in document order. The directory card carries the
          same note for the same reason. */}
      <div
        className={`relative px-4 pb-6 sm:px-6 sm:pb-8 ${
          // The avatar straddles the banner's lower edge, the same move the
          // directory card makes, so a club reads the same way in both places.
          cover ? "pt-4 sm:pt-5" : "pt-10 sm:pt-16"
        }`}
      >
        {/* Top-aligned, not bottom: the title has a different amount of detail
            under it on a club, a player and a tournament, so aligning the block's
            bottom to the avatar moves the h1 up or down with it — the title
            visibly jumped between the three. Aligning the top pins every profile
            title to the hero's own padding. */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          <div
            className={`w-fit rounded-full bg-pocket p-1.5 ${
              cover ? "-mt-14 sm:-mt-20" : ""
            }`}
          >
            <Avatar
              name={club.name}
              url={club.logo_url}
              mark
              className="h-20 w-20 sm:h-28 sm:w-28"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className={headlineClasses("display", "truncate")}>
              {club.name}
            </h1>
            {where(club) && (
              <a
                href={mapsUrl(club)}
                target="_blank"
                rel="noopener noreferrer"
                title={t("public.publicClub.directions")}
                className="mt-3 inline-flex max-w-full items-center gap-1.5 text-caption text-ink-soft transition-colors hover:text-ink"
              >
                <LuMapPin className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{where(club)}</span>
              </a>
            )}
            {listed.length > 0 && (
              <div className="mt-3 flex items-center gap-2.5">
                <div className="flex -space-x-2.5">
                  {listed.slice(0, 6).map((player) => (
                    <Avatar
                      key={player.id}
                      name={player.name}
                      url={player.avatar_url}
                      seed={player.id}
                      className="h-8 w-8"
                    />
                  ))}
                </div>
                <span className="text-caption text-ink-soft">
                  {t("public.publicClubs.members", { n: club.member_count })}
                </span>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* The link carries the picture with it: what it unfurls to in a
                chat is the card drawn by /api/og/clubs. */}
            <ShareButton title={club.name} url={url} />
            <ClubCta club={club} size="sm" />
          </div>
        </div>
      </div>

      <PublicClubTabs slug={club.slug} />
    </section>
  );
}
