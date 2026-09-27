import { useState } from "react";
import {
  keepPreviousData,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { LuUsers } from "react-icons/lu";
import PublicShell from "@/components/layout/PublicShell";
import { CtaBand } from "@/components/layout/CtaBand";
import PublicPageTitle from "@/components/layout/PublicPageTitle";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterMenu } from "@/components/ui/FilterMenu";
import { FilterGroup } from "@/components/ui/FilterGroup";
import { FilterPills } from "@/components/ui/FilterPills";
import { Pager } from "@/components/ui/Pager";
import { SearchInput } from "@/components/ui/SearchInput";
import MapView from "@/components/map/MapView";
import { useDebouncedQuery } from "@/hooks/useDebouncedQuery";
import { PUBLIC_PAGE_SIZE } from "@/queries/public/shared";
import {
  publicClubPinsQuery,
  publicClubsQuery,
  type Bbox,
  type PublicClubSort,
} from "@/queries/public/clubs";
import { useT } from "@/i18n";
import { ClubCard } from "@/components/public/ClubCard";

const route = getRouteApi("/_public/clubs/");

const SORTS: PublicClubSort[] = ["members", "name", "new"];

/**
 * The directory. A hero band, one sorted grid, searched by name.
 *
 * No "active this week" rail: that wants a last-played date per club and there is
 * no column for it, so it would be a subquery per card. Sorting by size is the
 * next best answer to "which of these is worth opening", and it costs nothing.
 */
export default function PublicClubsPage() {
  const { t } = useT();
  const search = route.useSearch();
  const navigate = route.useNavigate();

  // Tying the list to the map is off until asked for: arriving at /clubs should
  // show every club, not the handful the default view happens to frame.
  const [tiedToMap, setTiedToMap] = useState(false);
  // Reported by the map on load and on every settle, whether or not it is being
  // used — so ticking the box filters immediately rather than after a nudge.
  const [view, setView] = useState<Bbox | null>(null);
  const bbox = tiedToMap ? (view ?? undefined) : undefined;

  // useQuery, not useSuspenseQuery: the key changes with every pan, and
  // suspending would tear the whole list down and rebuild it each time. The
  // previous page stays on screen while the next one loads instead. The first
  // render asks for the unfiltered key the route loader has already cached, so
  // this is server-rendered all the same.
  const { data } = useQuery({
    ...publicClubsQuery({ ...search, bbox }),
    placeholderData: keepPreviousData,
  });
  // Only before the loader's data is in the cache, which is never in practice —
  // but `useQuery` cannot know that, and an empty page is a better answer than
  // a crash if it ever is.
  const clubs = data?.clubs ?? [];
  const totalCount = data?.totalCount ?? 0;
  // Loaded by the route alongside the directory itself, so the map's frame is in
  // the server's HTML and the grid below it does not move when the pins arrive.
  const { data: pins } = useSuspenseQuery(publicClubPinsQuery());

  // The route validator leaves these off so /clubs does not redirect to its own
  // canonical form; the defaults belong here and in the query factory instead.
  const sort = search.sort ?? "members";
  const page = search.page ?? 1;

  const setSort = (next: PublicClubSort | undefined) =>
    navigate({ search: { ...search, sort: next ?? "members", page: 1 } });

  const setPage = (page: number) => navigate({ search: { ...search, page } });

  // `replace`: typing is one intent, not one history entry per pause.
  const [q, setQ] = useDebouncedQuery(search.q ?? "", (value) =>
    navigate({
      search: { ...search, q: value || undefined, page: 1 },
      replace: true,
    }),
  );

  /**
   * Page 4 of everything is not page 4 of what the map can see, so a change to
   * the filter goes back to the first one.
   *
   * `replace`, because a pan is not a place someone meant to be able to go back
   * to — without it, crossing the country would leave thirty history entries
   * between the visitor and the page they arrived from.
   */
  const firstPage = () => {
    if (page > 1) navigate({ search: { ...search, page: 1 }, replace: true });
  };

  const tieToMap = (on: boolean) => {
    setTiedToMap(on);
    firstPage();
  };

  const onViewChange = (next: Bbox) => {
    setView(next);
    if (tiedToMap) firstPage();
  };

  return (
    <>
      <PublicPageTitle
        title={t("public.publicClubs.title")}
        lede={t("public.publicClubs.subtitle")}
      />

      <PublicShell>
        {/* Two columns from lg up: the filters and the grid on the left, the
            map beside them. One column below that, and no `items-start` on the
            grid — the map column has to stretch to the row's full height, or
            the sticky inside it would have nothing to travel through.

            The map's column grows in steps rather than as a fraction. A
            percentage would keep it a thumbnail on a laptop to stay modest on a
            large screen; the list can take the rest, because a card grid is
            happy to add a column and a map is not happy to be small. */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_30rem] 2xl:grid-cols-[minmax(0,1fr)_42rem]">
          {/* Every listed club with coordinates, not just this page of them:
              "which of these is near me" is a different question than the sort
              answers, and it is the one a map is good at.

              First in the markup so that on a phone, where this is one column,
              it is above the grid rather than below two dozen cards. The grid
              places it on the right from lg up. */}
          {pins.length > 0 && (
            <section
              aria-label={t("public.publicClubs.mapTitle")}
              className="mt-8 lg:col-start-2 lg:row-start-1"
            >
              {/* Sticky here rather than on the section: this is the part that
                  holds still while the list beside it is scrolled. */}
              <div className="lg:sticky lg:top-[calc(5rem+env(safe-area-inset-top))]">
                <MapView
                  className="h-72 w-full sm:h-96 lg:h-[calc(100dvh-8rem)]"
                  pins={pins.map((club) => ({
                    id: club.id,
                    lat: club.lat,
                    lon: club.lon,
                    label: club.name,
                    sublabel: [club.address, club.city]
                      .filter(Boolean)
                      .join(", "),
                    imageUrl: club.logo_url,
                  }))}
                  onSelectPin={(pin) => {
                    const club = pins.find((c) => c.id === pin.id);
                    if (club)
                      navigate({
                        to: "/clubs/$slug",
                        params: { slug: club.slug },
                      });
                  }}
                  onViewChange={onViewChange}
                  overlay={
                    // A plain checkbox, coloured by `accent-strike` — a native
                    // control here is one that already knows how to be focused,
                    // toggled with the keyboard and read out.
                    <label className="flex cursor-pointer items-center gap-2 rounded-control border border-hairline bg-felt/90 px-2.5 py-1.5 text-caption font-medium text-ink shadow-pop backdrop-blur-sm">
                      <input
                        type="checkbox"
                        checked={tiedToMap}
                        onChange={(e) => tieToMap(e.target.checked)}
                        className="h-3.5 w-3.5 accent-strike"
                      />
                      {t("public.publicClubs.tieToMap")}
                    </label>
                  }
                />
              </div>
            </section>
          )}

          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            {/* The negative margins let the bar bleed to the shell's edge on a
                phone. In a column it must not: they would pull it out from
                under the map. */}
            {/* `relative z-20`: the bar's own backdrop-blur is a stacking
                context, so the menu's z-index can only order it within this
                bar. Without a z here the transformed cards below paint over
                the open menu. */}
            <div className="relative z-20 -mx-4 mt-6 bg-pocket/90 px-4 py-3 backdrop-blur-lg sm:-mx-6 sm:px-6 lg:mx-0 lg:mt-8 lg:px-0">
              <div className="flex items-center justify-between gap-3">
                <FilterMenu activeCount={sort === "members" ? 0 : 1}>
                  <FilterGroup label={t("public.sort.label")}>
                    <FilterPills
                      label={t("public.sort.label")}
                      anyLabel={t("public.sort.members")}
                      value={sort === "members" ? undefined : sort}
                      onChange={setSort}
                      options={SORTS.filter((s) => s !== "members").map(
                        (s) => ({
                          value: s,
                          label: t(`public.sort.${s}`),
                        }),
                      )}
                    />
                  </FilterGroup>
                </FilterMenu>
                <SearchInput
                  value={q}
                  onChange={setQ}
                  placeholder={t("public.publicClubs.searchPlaceholder")}
                  className="min-w-0 flex-1"
                />
                <span className="shrink-0 font-mono text-caption tabular-nums text-ink-faint">
                  {t("public.publicClubs.count", { n: totalCount })}
                </span>
              </div>
            </div>

            {clubs.length === 0 ? (
              <Card className="mt-4">
                {/* Three different nothings: nowhere in this view, no match
                    for the search, and no clubs at all. Only the last one is
                    "there is nothing here yet", and saying that to someone who
                    has panned out to sea would be a lie about the product. */}
                <EmptyState
                  icon={<LuUsers className="h-5 w-5" aria-hidden />}
                  title={t(
                    bbox
                      ? "public.publicClubs.noneInView"
                      : search.q
                        ? "public.publicClubs.noResults"
                        : "public.publicClubs.emptyTitle",
                  )}
                  hint={t(
                    bbox
                      ? "public.publicClubs.noneInViewHint"
                      : search.q
                        ? "public.publicClubs.noResultsHint"
                        : "public.publicClubs.emptyHint",
                  )}
                />
              </Card>
            ) : (
              <>
                {/* Two across in the narrower left column, and more as the
                    column widens — without the last step a card on a large
                    screen is half a metre of empty tint. */}
                <div className="mt-8 grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                  {clubs.map((club) => (
                    <ClubCard key={club.id} club={club} />
                  ))}
                </div>
                <Pager
                  page={page}
                  pageSize={PUBLIC_PAGE_SIZE}
                  totalCount={totalCount}
                  onPage={setPage}
                />
              </>
            )}
          </div>
        </div>

        {/* ODbL. Part of this directory was seeded from OpenStreetMap (see
            scripts/es-clubs.mjs), and the licence asks for the credit. The
            map's own control credits the tiles, which is a different thing
            from crediting the club rows. */}
        <p className="mt-10 text-caption text-ink-faint">
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-hairline underline-offset-2 transition-colors hover:text-ink-soft"
          >
            {t("public.publicClubs.dataCredit")}
          </a>
        </p>

        <CtaBand />
      </PublicShell>
    </>
  );
}
