import type { CSSProperties } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { LuUsers } from "react-icons/lu";
import PublicShell, { CtaBand } from "@/components/PublicShell";
import { Avatar } from "@/components/ui/Avatar";
import { BallGlyph } from "@/components/ui/Ball";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterPills } from "@/components/ui/FilterPills";
import { Pager } from "@/components/ui/Pager";
import { SearchInput } from "@/components/ui/SearchInput";
import { Shot } from "@/components/ui/Shot";
import { CLUB_BALL_LABEL } from "@/libs/clubTheme";
import { useDebouncedQuery } from "@/libs/useDebouncedQuery";
import { PUBLIC_PAGE_SIZE, publicClubsQuery } from "@/queries/public";
import type { PublicClub, PublicClubSort } from "@/queries/public";
import { useT } from "@/i18n";

const route = getRouteApi("/_public/clubs/");

const SORTS: PublicClubSort[] = ["members", "name", "new"];

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const isNew = (createdAt: string | null) =>
  createdAt !== null && Date.now() - new Date(createdAt).getTime() < THIRTY_DAYS_MS;

/**
 * The directory. A hero, a rail of the biggest clubs, one sorted grid, searched
 * by name.
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

  const [q, setQ] = useDebouncedQuery(search.q ?? "", (value) =>
    // replace: typing is not a series of places to go back through.
    navigate({
      search: { ...search, q: value || undefined, page: 1 },
      replace: true,
    }),
  );

  const setSort = (next: PublicClubSort | undefined) =>
    navigate({ search: { ...search, sort: next ?? "members", page: 1 } });

  const setPage = (page: number) => navigate({ search: { ...search, page } });

  // "Biggest" is only true under the default sort — under any other sort, or a
  // search, the rail's claim to be "featured" stops being honest.
  const showFeatured = !search.q && sort === "members" && data.clubs.length > 0;

  return (
    <PublicShell>
      <section className="relative mt-6 overflow-hidden rounded-sheet border border-hairline-strong bg-felt">
        <Shot
          name="hero-clubs"
          seed="clubs-hero"
          size={[1600, 900]}
          alt=""
          priority
          className="absolute inset-0 h-full opacity-70"
        />
        <div className="scrim absolute inset-0" />
        <div className="relative flex min-h-[200px] flex-col justify-end gap-2 p-6 sm:min-h-[260px] sm:p-8">
          <h1 className="text-h1 font-semibold tracking-tight text-ink md:text-display">
            {t("public.publicClubs.title")}
          </h1>
          <p className="max-w-[52ch] text-body text-ink-soft sm:text-h4">
            {t("public.publicClubs.subtitle")}
          </p>
        </div>
      </section>

      {showFeatured && (
        <section className="mt-10">
          <h2 className="text-h3 font-semibold tracking-tight text-ink">
            {t("public.publicClubs.featured")}
          </h2>
          <div className="no-bar -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
            {data.clubs.slice(0, 6).map((club, i) => (
              <Link
                key={club.id}
                to="/clubs/$slug"
                params={{ slug: club.slug }}
                data-ball={club.theme_color}
                style={{ "--i": i } as CSSProperties}
                className="wash rise lift group flex w-56 shrink-0 snap-start flex-col gap-3 rounded-card border border-hairline p-4"
              >
                <Avatar name={club.name} url={club.logo_url} className="h-12 w-12" />
                <div className="min-w-0">
                  <h3 className="truncate text-body font-semibold text-ink transition-colors duration-150 group-hover:text-strike">
                    {club.name}
                  </h3>
                  <p className="text-caption tabular-nums text-ink-faint">
                    {t("public.publicClubs.members", { n: club.member_count })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="sticky top-16 z-10 -mx-4 mt-10 border-y border-hairline bg-pocket/90 px-4 py-3 backdrop-blur-lg sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder={t("public.publicClubs.searchPlaceholder")}
            className="w-full sm:max-w-sm"
          />
          <div className="flex items-center justify-between gap-3">
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
            <span className="shrink-0 font-mono text-caption tabular-nums text-ink-faint">
              {t("public.publicClubs.count", { n: data.totalCount })}
            </span>
          </div>
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
  );
}

function ClubCard({ club, index }: { club: PublicClub; index: number }) {
  const { t } = useT();

  return (
    <Link
      to="/clubs/$slug"
      params={{ slug: club.slug }}
      data-ball={club.theme_color}
      style={{ "--i": index } as CSSProperties}
      className="rise lift group block overflow-hidden rounded-card border border-hairline bg-felt"
    >
      <div className="wash relative aspect-video overflow-hidden">
        <Shot
          name={`club-${club.id}`}
          seed={`club-${club.id}`}
          size={[800, 450]}
          alt=""
          className="absolute inset-0 opacity-45"
        />
        <BallGlyph
          color={club.theme_color}
          label={CLUB_BALL_LABEL[club.theme_color]}
          className="absolute top-3 right-3 h-8 w-8 drop-shadow-md"
        />
        {isNew(club.created_at) && (
          <span className="absolute top-3 left-3 rounded-full bg-strike px-2 py-0.5 font-mono text-caption font-semibold text-pocket">
            {t("public.publicClubs.new")}
          </span>
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="-mt-8 inline-flex rounded-card bg-felt p-1">
          <Avatar name={club.name} url={club.logo_url} className="h-14 w-14" />
        </div>
        <h3 className="mt-3 truncate text-h4 font-semibold text-ink transition-colors duration-150 group-hover:text-strike">
          {club.name}
        </h3>
        <p className="mt-0.5 text-caption tabular-nums text-ink-faint">
          {t("public.publicClubs.members", { n: club.member_count })}
        </p>
      </div>
    </Link>
  );
}
