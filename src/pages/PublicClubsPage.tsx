import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { LuUsers } from "react-icons/lu";
import PublicShell from "@/components/PublicShell";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { cardClasses } from "@/components/ui/cardStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterPills } from "@/components/ui/FilterPills";
import { Pager } from "@/components/ui/Pager";
import { SearchInput } from "@/components/ui/SearchInput";
import { useDebouncedQuery } from "@/libs/useDebouncedQuery";
import { PUBLIC_PAGE_SIZE, publicClubsQuery } from "@/queries/public";
import type { PublicClub, PublicClubSort } from "@/queries/public";
import { useT } from "@/i18n";

const route = getRouteApi("/_public/clubs/");

const SORTS: PublicClubSort[] = ["members", "name", "new"];

/**
 * The directory. One sorted grid, searched by name.
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

  return (
    <PublicShell
      title={t("public.publicClubs.title")}
      subtitle={t("public.publicClubs.subtitle")}
    >
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
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.clubs.map((club) => (
              <ClubCard key={club.id} club={club} />
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
    </PublicShell>
  );
}

function ClubCard({ club }: { club: PublicClub }) {
  const { t } = useT();

  return (
    <Link
      to="/clubs/$slug"
      params={{ slug: club.slug }}
      className={cardClasses({
        interactive: true,
        className: "group flex items-center gap-3 p-4",
      })}
    >
      {/* The logo is the club's own, so it is shown as uploaded rather than
          tinted — Avatar falls back to the initial when there isn't one. */}
      <Avatar name={club.name} url={club.logo_url} className="h-11 w-11" />
      <div className="min-w-0">
        <h3 className="truncate text-body font-medium text-ink transition-colors duration-150 group-hover:text-strike">
          {club.name}
        </h3>
        <p className="mt-0.5 truncate text-caption tabular-nums text-ink-faint">
          {t("public.publicClubs.members", { n: club.member_count })}
        </p>
      </div>
    </Link>
  );
}
