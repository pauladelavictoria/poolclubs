import type { CSSProperties } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { LuUsers } from "react-icons/lu";
import PublicShell, { CtaBand } from "@/components/PublicShell";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterGroup, FilterMenu } from "@/components/ui/FilterMenu";
import { FilterPills } from "@/components/ui/FilterPills";
import { Pager } from "@/components/ui/Pager";
import { PUBLIC_PAGE_SIZE, publicClubsQuery } from "@/queries/public";
import type { PublicClub, PublicClubSort } from "@/queries/public";
import { useT } from "@/i18n";

const route = getRouteApi("/_public/clubs/");

const SORTS: PublicClubSort[] = ["members", "name", "new"];

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const isNew = (createdAt: string | null) =>
  createdAt !== null &&
  Date.now() - new Date(createdAt).getTime() < THIRTY_DAYS_MS;

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

  const { data } = useSuspenseQuery(publicClubsQuery(search));

  // The route validator leaves these off so /clubs does not redirect to its own
  // canonical form; the defaults belong here and in the query factory instead.
  const sort = search.sort ?? "members";
  const page = search.page ?? 1;

  const setSort = (next: PublicClubSort | undefined) =>
    navigate({ search: { ...search, sort: next ?? "members", page: 1 } });

  const setPage = (page: number) => navigate({ search: { ...search, page } });

  return (
    <>
      <section>
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="text-display leading-[1.05] font-semibold tracking-tighter text-ink">
            {t("public.publicClubs.title")}
          </h1>
          <p className="mt-4 max-w-[46ch] text-h4 text-ink-soft">
            {t("public.publicClubs.subtitle")}
          </p>
        </div>
      </section>

      <PublicShell>
        <div className="sticky top-16 z-10 -mx-4 mt-8 bg-pocket/90 px-4 py-3 backdrop-blur-lg sm:-mx-6 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <FilterMenu activeCount={sort === "members" ? 0 : 1}>
              <FilterGroup label={t("public.sort.label")}>
                <FilterPills
                  label={t("public.sort.label")}
                  anyLabel={t("public.sort.members")}
                  value={sort === "members" ? undefined : sort}
                  onChange={setSort}
                  options={SORTS.filter((s) => s !== "members").map((s) => ({
                    value: s,
                    label: t(`public.sort.${s}`),
                  }))}
                />
              </FilterGroup>
            </FilterMenu>
            <span className="shrink-0 font-mono text-caption tabular-nums text-ink-faint">
              {t("public.publicClubs.count", { n: data.totalCount })}
            </span>
          </div>
        </div>

        {data.clubs.length === 0 ? (
          <Card className="mt-4">
            <EmptyState
              icon={<LuUsers className="h-5 w-5" aria-hidden />}
              title={
                search.q
                  ? t("public.publicClubs.noResults")
                  : t("public.publicClubs.emptyTitle")
              }
              hint={
                search.q
                  ? t("public.publicClubs.noResultsHint")
                  : t("public.publicClubs.emptyHint")
              }
            />
          </Card>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.clubs.map((club, i) => (
                <ClubCard key={club.id} club={club} index={i} />
              ))}
            </div>
            <Pager
              page={page}
              pageSize={PUBLIC_PAGE_SIZE}
              totalCount={data.totalCount}
              onPage={setPage}
            />
          </>
        )}

        <CtaBand />
      </PublicShell>
    </>
  );
}

/**
 * No photograph. The club's colour is the art: a short washed band, the logo
 * straddling its lower edge, and the two facts a directory reader wants.
 *
 * The band is a fixed height rather than an aspect ratio, so a card does not get
 * taller as the grid gets wider — a directory is something you scan down, and
 * every row of it should cost the same amount of screen.
 */
function ClubCard({ club, index }: { club: PublicClub; index: number }) {
  const { t } = useT();

  return (
    <Link
      to="/clubs/$slug"
      params={{ slug: club.slug }}
      data-ball={club.theme_color}
      style={{ "--i": index } as CSSProperties}
      className="pop lift group block overflow-hidden rounded-card border border-hairline bg-felt"
    >
      <div className="wash relative h-20 overflow-hidden transition-[filter] duration-300 group-hover:saturate-150">
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
      <div className="relative px-3 pb-3">
        {/* `flex w-fit`, never `inline-flex`. An inline-level flex box is aligned
            on its baseline, and a flex container takes the baseline of its first
            item — which is real text for the initial fallback and nothing at all
            for an <img>. That put the two kinds of logo on different lines by a
            few pixels. Block-level takes it out of the line box entirely. */}
        <div className="-mt-6 flex w-fit rounded-full bg-felt p-1">
          <Avatar
            name={club.name}
            url={club.logo_url}
            mark
            className="h-11 w-11"
          />
        </div>
        <h3 className="mt-2 truncate text-body font-semibold text-ink transition-colors duration-150 group-hover:text-strike">
          {club.name}
        </h3>
        <p className="mt-0.5 font-mono text-caption tabular-nums text-ink-faint">
          {t("public.publicClubs.members", { n: club.member_count })}
        </p>
      </div>
    </Link>
  );
}
