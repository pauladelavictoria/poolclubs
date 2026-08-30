import { useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { LuMapPin, LuX } from "react-icons/lu";
import GamesList from "@/components/games/GamesList";
import ShareButton from "@/components/social/ShareButton";
import PublicShell from "@/components/layout/PublicShell";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardHeader } from "@/components/ui/Card";
import { DisciplineBall } from "@/components/ui/Ball";
import { SectionHead } from "@/components/ui/SectionHead";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { gamesQuery } from "@/queries/games";
import { clubPhotosQuery, type ClubPhoto } from "@/queries/clubPhotos";
import { orderPhotos } from "@/libs/algorithms/photoOrder";
import { useDialog } from "@/hooks/useDialog";
import {
  publicClubRosterQuery,
  type PublicClub,
  type PublicClubDetail,
  type PublicPlayer,
} from "@/queries/public/clubs";
import { useNow } from "@/hooks/useNow";
import {
  isAllDay,
  isEmpty,
  isOpenNow,
  parseSchedule,
  weekRows,
} from "@/libs/algorithms/schedule";
import {
  publicTournamentsQuery,
  type PublicTournamentListItem,
} from "@/queries/public/tournaments";
import { useT, type Key } from "@/i18n";

const route = getRouteApi("/_public/clubs/$slug");

/** Enough recent results to show the club is alive, not its whole history —
 *  which is what /clubs/$slug is for and the club's own app is not. */
export const CLUB_GAMES_LIMIT = 30;

/** The address as the page prints it. Empty for a club that never set one. */
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

const isLive = (status: PublicTournamentListItem["status"]) =>
  status === "running" || status === "groups";
const entrantsOf = (t: PublicTournamentListItem) =>
  t.tournament_players[0]?.count ?? 0;

/**
 * A club's public face: who plays there, who is winning, what is on, and one way
 * in.
 *
 * It reads as a page rather than a dashboard on purpose — a stranger arriving
 * from a link has no idea what any of this is yet, so each block says what it is
 * before it says a number.
 */
export default function PublicClubPage() {
  const { t } = useT();
  const { club, origin } = route.useLoaderData();

  // The club itself comes from the loader — it already threw notFound() if there
  // wasn't one, so it is non-null here where the query's type is nullable. The
  // rest read from the cache the loader primed.
  const { data: roster } = useSuspenseQuery(publicClubRosterQuery(club.id));
  const { data: gamesData } = useSuspenseQuery(
    gamesQuery(club.id, { pageSize: CLUB_GAMES_LIMIT }),
  );
  const { data: tournamentsData } = useSuspenseQuery(
    publicTournamentsQuery({ clubId: club.id }),
  );

  const url = `${origin}/clubs/${club.slug}`;

  // The roster grid is the one block that is a list of people, so it is the one
  // place the opt-out applies. Everything else on this page is the club's record.
  //
  // Faces first: the hero shows the first six of these, and six initials in
  // circles say nothing about the club. Stable, so within each group the roster
  // keeps the order it arrived in.
  const listed = roster
    .filter((player) => player.is_public)
    .sort((a, b) => Number(!!b.avatar_url) - Number(!!a.avatar_url));

  const tournaments = tournamentsData.tournaments;
  // Being played first, still taking entries after: one is happening right now
  // and the other is a date in somebody's diary. Stable within each group.
  const onNow = tournaments
    .filter((x) => isLive(x.status) || x.status === "open")
    .sort((a, b) => Number(isLive(b.status)) - Number(isLive(a.status)));

  const playingSince = club.created_at
    ? new Date(club.created_at).getFullYear()
    : null;

  // Read here rather than inside ClubPhotos because the hero needs the first
  // one too, and both must agree about which photo leads.
  const { data: storedPhotos = [] } = useQuery(clubPhotosQuery(club.id));
  const photos = orderPhotos(storedPhotos, club.photo_order);
  const cover = photos[0] ?? null;

  return (
    <>
      <ClubHero club={club} listed={listed} url={url} cover={cover} />

      <PublicShell>
        <div className="grid grid-cols-3 divide-x divide-hairline">
          <Stat
            value={club.member_count}
            label={t("public.publicClub.statMembers")}
          />
          <Stat
            value={gamesData.totalCount ?? 0}
            label={t("public.publicClub.statGames")}
          />
          {playingSince && (
            <Stat
              value={playingSince}
              label={t("public.publicClub.statSince", { year: playingSince })}
            />
          )}
        </div>

        <ClubPhotos photos={photos} />

        <ClubVisit club={club} />

        <section className="mt-10">
          <SectionHead title={t("public.publicClub.tournaments")} />
          {onNow.length === 0 ? (
            <p className="mt-4 text-body text-ink-faint">
              {t("public.publicClub.noTournamentsTitle")}
            </p>
          ) : (
            // py-2, not pb-1: `overflow-x: auto` clips vertically too, so the
            // 3px a card rises on hover — and the shadow above it — was cut off
            // against the top edge of the scroller.
            <div className="no-bar -mx-4 mt-2 flex snap-x gap-3 overflow-x-auto px-4 py-2 sm:-mx-6 sm:px-6">
              {onNow.map((tournament) => (
                <Link
                  key={tournament.id}
                  to="/tournaments/$tournamentId"
                  params={{ tournamentId: String(tournament.id) }}
                  className="lift flex w-56 shrink-0 snap-start flex-col gap-2 rounded-card border border-hairline bg-felt p-4"
                >
                  <div className="flex items-center justify-between">
                    <DisciplineBall
                      discipline={tournament.discipline}
                      className="h-6 w-6"
                    />
                    {isLive(tournament.status) && (
                      <span
                        className="live-dot h-1.5 w-1.5 rounded-full bg-strike"
                        aria-hidden
                      />
                    )}
                  </div>
                  <span className="truncate text-body font-medium text-ink">
                    {tournament.name}
                  </span>
                  <span className="font-mono text-caption tabular-nums text-ink-faint">
                    {t("tournaments.entrants", { n: entrantsOf(tournament) })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <SectionHead title={t("public.publicClub.roster")} />
          {listed.length === 0 ? (
            <p className="mt-4 text-body text-ink-faint">
              {t("public.publicClub.noRosterHint")}
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-4 gap-4 sm:grid-cols-6 lg:grid-cols-8">
              {listed.map((player) => (
                <Link
                  key={player.id}
                  to="/players/$playerSlug"
                  params={{ playerSlug: player.slug }}
                  className="group flex flex-col items-center gap-1.5 text-center"
                >
                  <Avatar
                    name={player.name}
                    url={player.avatar_url}
                    seed={player.id}
                    className="h-16 w-16 transition-transform duration-150 group-hover:scale-105 sm:h-20 sm:w-20"
                  />
                  <span className="w-full truncate text-caption text-ink-soft group-hover:text-ink">
                    {player.name}
                  </span>
                </Link>
              ))}
            </div>
          )}
          {/* Said plainly rather than left as a discrepancy the reader has to
              spot between the count above and the length of this list. */}
          {club.member_count > listed.length && (
            <p className="mt-4 text-caption text-ink-faint">
              {t("public.publicClub.hiddenMembers", {
                n: club.member_count - listed.length,
              })}
            </p>
          )}
        </section>

        <Card className="mt-10 overflow-hidden">
          <CardHeader title={t("public.publicClub.recentResults")} />
          <div className="p-3">
            <GamesList
              games={gamesData.games}
              players={roster}
              showDates
              public
            />
          </div>
        </Card>

        <section
          data-ball={club.theme_color}
          className="wash wash-soft mt-10 flex flex-col items-center gap-3 rounded-sheet border border-hairline p-10 text-center"
        >
          <h2 className="max-w-[24ch] text-display leading-[1.05] font-semibold tracking-tighter text-ink">
            {t("public.publicClub.joinTitle", { name: club.name })}
          </h2>
          <p className="max-w-[46ch] text-body text-ink-soft">
            {t("public.publicClub.joinBody")}
          </p>
          <Link to="/app" className={buttonClasses({ className: "mt-2 px-6" })}>
            {t("public.cta.joinClub")}
          </Link>
        </section>
      </PublicShell>
    </>
  );
}

/**
 * Full-bleed, the Patreon creator-header shape: a cover band, the logo plate
 * overlapping it, the name at display size, the roster as the social-proof
 * line underneath. Rendered as a sibling of `PublicShell` rather than inside
 * it — that is what lets it bleed to the edges the shell's own measure would
 * otherwise clip.
 */
function ClubHero({
  club,
  listed,
  url,
  cover,
}: {
  club: PublicClub;
  listed: PublicPlayer[];
  url: string;
  /** The club's first photo, if it has any. Behind the accent wash rather than
   *  instead of it, so a club with no photos loses nothing. */
  cover: ClubPhoto | null;
}) {
  const { t } = useT();

  return (
    <section
      data-ball={club.theme_color}
      className="wash wash-soft relative overflow-hidden border-b border-hairline"
    >
      {cover && (
        <>
          <img
            src={cover.url}
            alt=""
            // Decorative: the club's name is right on top of it and is the
            // heading. A description here would be read out before it.
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* The scrim, and it is not optional. A photo of a bright room puts
              near-white behind near-white text; this keeps the h1 and the
              address readable over whatever the club happened to upload, in
              both themes, without knowing anything about the image. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-felt via-felt/85 to-felt/60"
          />
        </>
      )}
      <div className="relative px-4 pt-10 pb-8 sm:px-6 sm:pt-16 sm:pb-10">
        {/* Top-aligned, not bottom: the title has a different amount of detail
            under it on a club, a player and a tournament, so aligning the block's
            bottom to the avatar moves the h1 up or down with it — the title
            visibly jumped between the three. Aligning the top pins every profile
            title to the hero's own padding. */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          <div className="w-fit rounded-sheet bg-felt p-1.5">
            <Avatar
              name={club.name}
              url={club.logo_url}
              mark
              shape="plate"
              className="h-20 w-20 sm:h-28 sm:w-28"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-display leading-[1.05] font-semibold tracking-tighter text-ink">
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
            <ShareButton title={club.name} url={url} />
            <Link to="/app" className={buttonClasses({ size: "sm" })}>
              {t("public.cta.joinClub")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The venue itself, if the club has published any pictures of it.
 *
 * Renders nothing at all when there are none, which is most clubs — the hero
 * above already carries the club's accent wash and its logo, and an empty
 * gallery slot under it would be worse than no gallery.
 *
 * The same CSS scroll-snap strip the tournaments and the roster use rather than
 * a carousel dependency: it is four utility classes, it works with a thumb, a
 * trackpad and a keyboard, and it degrades to a plain scrolling row with no JS.
 */
function ClubPhotos({ photos }: { photos: ClubPhoto[] }) {
  const { t } = useT();
  const [open, setOpen] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <section className="mt-10">
      <SectionHead title={t("public.publicClub.photos")} />
      {/* py-2, not pb-1, for the same reason as the tournament strip above:
          overflow-x clips vertically too. */}
      <div className="no-bar -mx-4 mt-2 flex snap-x gap-3 overflow-x-auto px-4 py-2 sm:-mx-6 sm:px-6">
        {photos.map((photo, i) => (
          <button
            key={photo.path}
            type="button"
            onClick={() => setOpen(i)}
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
function PhotoLightbox({
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
  const photo = index === null ? null : photos[index];

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
              {index !== null ? index + 1 : 0} / {photos.length}
            </p>
          )}
        </div>
      )}
    </dialog>
  );
}

/**
 * What a stranger needs before turning up: what the club says it is, when it is
 * open and how to phone it.
 *
 * The whole section is absent for a club that has set none of the three, rather
 * than three empty headings — most clubs will not have filled this in, and the
 * page above and below it already stands on its own.
 */
function ClubVisit({ club }: { club: PublicClubDetail }) {
  const { t } = useT();
  const schedule = parseSchedule(club.schedule);
  const hasHours = !isEmpty(schedule);

  // Null until an effect runs, which is the point: "open now" is `Date.now()`,
  // and rendering it on the server would be a hydration mismatch that resolves
  // wrong for a few minutes either side of closing time. The server renders no
  // pill and the browser fills it in. Same trick useSuggestions uses.
  const now = useNow();
  const open =
    now !== null && hasHours && isOpenNow(schedule, club.timezone, now);

  if (!club.description && !club.phone && !hasHours) return null;

  return (
    <section className="mt-10">
      <SectionHead title={t("public.publicClub.visit")} />

      {club.description && (
        // whitespace-pre-line: the admin typed it in a textarea, so their
        // paragraph breaks are the only formatting there is.
        <p className="mt-4 whitespace-pre-line text-body text-ink-soft">
          {club.description}
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {hasHours && (
          <div className="rounded-card border border-hairline bg-felt p-4">
            <div className="flex items-center justify-between gap-2 pb-2">
              <h3 className="text-body font-medium text-ink">
                {t("club.schedule.title")}
              </h3>
              {now !== null && (
                <span
                  className={[
                    "shrink-0 rounded-full px-2 py-0.5 text-caption font-medium",
                    open ? "bg-strike text-pocket" : "bg-pocket text-ink-faint",
                  ].join(" ")}
                >
                  {t(
                    open ? "club.schedule.openNow" : "club.schedule.closedNow",
                  )}
                </span>
              )}
            </div>
            <dl className="divide-y divide-hairline">
              {weekRows(schedule).map((row) => (
                <div
                  // The first day names the run, and a run is a set of
                  // consecutive days, so it is unique across the week.
                  key={row.days[0]}
                  className="flex justify-between gap-3 py-1.5"
                >
                  <dt className="text-body text-ink-soft">
                    {row.days.length === 7
                      ? t("club.schedule.everyDay")
                      : row.days.length === 1
                        ? t(`club.schedule.day.${row.days[0]}` as Key)
                        : `${t(`club.schedule.day.${row.days[0]}` as Key)} – ${t(
                            `club.schedule.day.${row.days[row.days.length - 1]}` as Key,
                          )}`}
                  </dt>
                  <dd className="text-right font-mono text-body tabular-nums text-ink">
                    {/* "00:00–00:00" is technically what an all-day row
                        holds, and it reads as a typo. */}
                    {isAllDay(row.ranges)
                      ? t("club.schedule.allDay")
                      : row.ranges.length
                        ? row.ranges.map(([f, s]) => `${f}–${s}`).join(", ")
                        : t("club.schedule.closed")}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {club.phone && (
          <div className="rounded-card border border-hairline bg-felt p-4">
            <h3 className="pb-2 text-body font-medium text-ink">
              {t("club.phone")}
            </h3>
            {/* tel: with the string exactly as typed. Stripping spaces would
                be a guess about a format that differs by country, and every
                dialler already ignores them. */}
            <a
              href={`tel:${club.phone}`}
              className="font-mono text-body text-strike transition-colors duration-150 hover:text-strike-light"
            >
              {club.phone}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-4 text-center">
      <span className="font-mono text-display font-semibold tabular-nums text-ink">
        {value}
      </span>
      <span className="text-caption text-ink-faint">{label}</span>
    </div>
  );
}
