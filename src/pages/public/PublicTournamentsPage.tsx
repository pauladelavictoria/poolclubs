import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { LuNetwork } from "react-icons/lu";
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
import { useDebouncedQuery } from "@/hooks/useDebouncedQuery";
import { PUBLIC_PAGE_SIZE } from "@/queries/public/shared";
import { publicTournamentsQuery } from "@/queries/public/tournaments";
import {
  DISCIPLINES,
  FORMAT_KEY,
  type Discipline,
  type TournamentFormat,
  type TournamentStatus,
} from "@/types";
import { useT, type Key } from "@/i18n";
import { TournamentCard } from "@/components/public/TournamentCard";

const route = getRouteApi("/_public/tournaments/");

/** Live first, then what is still open, then the archive. Exported because a
 *  club's own tournaments tab is the same page scoped to one club, and the two
 *  have to group and order it the same way. */
// eslint-disable-next-line react-refresh/only-export-components
export const GROUPS: { key: Key; statuses: TournamentStatus[] }[] = [
  { key: "tournaments.live", statuses: ["groups", "running"] },
  { key: "tournaments.openTitle", statuses: ["open"] },
  // The archive is cards too now, not rows in one Card. A finished tournament
  // has the one thing an open one cannot show — who won it — and a row had
  // nowhere to put a podium.
  { key: "tournaments.finished", statuses: ["done"] },
];

const STATUSES: TournamentStatus[] = ["open", "running", "done"];

const FORMATS: TournamentFormat[] = ["double_elim", "league", "group_knockout"];

export default function PublicTournamentsPage() {
  const { t } = useT();
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const { data } = useSuspenseQuery(publicTournamentsQuery(search));

  // See the route: left off the validator so /tournaments does not redirect to
  // its own canonical form.
  const page = search.page ?? 1;

  // One patch function for all three facets: each resets to page 1, because
  // page 4 of a different filter is not a place anyone asked to be.
  const setFacet = (patch: Partial<typeof search>) =>
    navigate({ search: { ...search, ...patch, page: 1 } });

  // `replace`: typing is one intent, not one history entry per pause.
  const [q, setQ] = useDebouncedQuery(search.q ?? "", (value) =>
    navigate({
      search: { ...search, q: value || undefined, page: 1 },
      replace: true,
    }),
  );

  const all = data.tournaments;
  const grouped = GROUPS.map(({ key, statuses }) => ({
    key,
    rows: all.filter((x) => statuses.includes(x.status)),
  })).filter((group) => group.rows.length > 0);

  const filtered =
    Boolean(search.q) ||
    Boolean(search.status) ||
    Boolean(search.format) ||
    Boolean(search.discipline);

  // Drawn on the filter button. All three facets count, not just the two that
  // used to sit behind a "more" disclosure: the menu hides every one of them
  // now, so every one of them has to be announced.
  const activeFacets =
    (search.status ? 1 : 0) +
    (search.format ? 1 : 0) +
    (search.discipline ? 1 : 0);

  return (
    <>
      <PublicPageTitle
        title={t("public.publicTournaments.title")}
        lede={t("public.publicTournaments.subtitle")}
      />

      <PublicShell>
        <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-10 -mx-4 mt-8 bg-pocket/90 px-4 py-3 backdrop-blur-lg sm:-mx-6 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <FilterMenu activeCount={activeFacets}>
              <FilterGroup label={t("tournaments.statusLabel")}>
                <FilterPills
                  label={t("tournaments.statusLabel")}
                  anyLabel={t("public.filters.anyStatus")}
                  value={search.status}
                  onChange={(status) => setFacet({ status })}
                  options={STATUSES.map((s) => ({
                    value: s,
                    label: t(`tournaments.status.${s}`),
                  }))}
                />
              </FilterGroup>
              <FilterGroup label={t("tournaments.format")}>
                <FilterPills
                  label={t("tournaments.format")}
                  anyLabel={t("public.filters.anyFormat")}
                  value={search.format}
                  onChange={(format) => setFacet({ format })}
                  options={FORMATS.map((f) => ({
                    value: f,
                    label: t(`tournaments.${FORMAT_KEY[f]}`),
                  }))}
                />
              </FilterGroup>
              <FilterGroup label={t("games.discipline")}>
                <FilterPills
                  label={t("games.discipline")}
                  anyLabel={t("public.filters.anyDiscipline")}
                  value={search.discipline}
                  onChange={(discipline) => setFacet({ discipline })}
                  options={(DISCIPLINES as Discipline[]).map((d) => ({
                    value: d,
                    label: t(`discipline.${d}`),
                  }))}
                />
              </FilterGroup>
            </FilterMenu>
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder={t("public.publicTournaments.searchPlaceholder")}
              className="min-w-0 flex-1"
            />
          </div>
        </div>

        {all.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon={<LuNetwork className="h-5 w-5" aria-hidden />}
              title={
                filtered
                  ? t("public.publicTournaments.noResults")
                  : t("public.publicTournaments.emptyTitle")
              }
              hint={
                filtered
                  ? t("public.publicTournaments.noResultsHint")
                  : t("public.publicTournaments.emptyHint")
              }
            />
          </Card>
        ) : (
          <>
            <div className="mt-8 space-y-10">
              {grouped.map(({ key, rows }) => (
                <section key={key}>
                  <h2 className="px-1 pb-3 text-caption font-medium tracking-[0.08em] text-ink-faint uppercase">
                    {t(key)}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {rows.map((tournament) => (
                      <TournamentCard
                        key={tournament.id}
                        tournament={tournament}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <Pager
              page={page}
              pageSize={PUBLIC_PAGE_SIZE}
              totalCount={data.totalCount}
              onPage={(page) => navigate({ search: { ...search, page } })}
            />
          </>
        )}

        <CtaBand />
      </PublicShell>
    </>
  );
}
