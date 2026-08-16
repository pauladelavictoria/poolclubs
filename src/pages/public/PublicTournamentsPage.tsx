import type { CSSProperties } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { LuNetwork, LuUsers } from "react-icons/lu";
import PublicShell, { CtaBand } from "@/components/layout/PublicShell";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryBadge, DisciplineBall } from "@/components/ui/Ball";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterGroup, FilterMenu } from "@/components/ui/FilterMenu";
import { FilterPills } from "@/components/ui/FilterPills";
import { Pager } from "@/components/ui/Pager";
import { PUBLIC_PAGE_SIZE, publicTournamentsQuery } from "@/queries/public";
import type { PublicTournamentListItem } from "@/queries/public";
import {
  DISCIPLINES,
  FORMAT_KEY,
  type Discipline,
  type TournamentFormat,
  type TournamentStatus,
} from "@/types";
import { useT, type Key } from "@/i18n";

const route = getRouteApi("/_public/tournaments/");

/** Live first, then what is still open, then the archive — the same order the
 *  club's own index uses, so the two read the same way round. */
const GROUPS: { key: Key; statuses: TournamentStatus[] }[] = [
  { key: "tournaments.live", statuses: ["groups", "running"] },
  { key: "tournaments.openTitle", statuses: ["open"] },
];

const STATUSES: TournamentStatus[] = ["open", "running", "done"];
const FORMATS: TournamentFormat[] = ["double_elim", "league", "group_knockout"];

const isLive = (status: TournamentStatus) =>
  status === "groups" || status === "running";

/** PostgREST returns the aggregate as a one-row array, or none at all. */
const entrants = (t: PublicTournamentListItem) =>
  t.tournament_players[0]?.count ?? 0;

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

  const all = data.tournaments;
  const grouped = GROUPS.map(({ key, statuses }) => ({
    key,
    rows: all.filter((x) => statuses.includes(x.status)),
  })).filter((group) => group.rows.length > 0);
  const finished = all.filter((x) => x.status === "done");

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
      <section>
        <div className="px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="text-display leading-[1.05] font-semibold tracking-tighter text-ink">
            {t("public.publicTournaments.title")}
          </h1>
          <p className="mt-4 max-w-[46ch] text-h4 text-ink-soft">
            {t("public.publicTournaments.subtitle")}
          </p>
        </div>
      </section>

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
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {rows.map((tournament, i) => (
                      <TournamentCard
                        key={tournament.id}
                        tournament={tournament}
                        index={i}
                      />
                    ))}
                  </div>
                </section>
              ))}

              {/* The archive must not look like the news: rows in one Card, not
                cards of their own. */}
              {finished.length > 0 && (
                <section>
                  <h2 className="px-1 pb-3 text-caption font-medium tracking-[0.08em] text-ink-faint uppercase">
                    {t("tournaments.finished")}
                  </h2>
                  <Card className="divide-y divide-hairline">
                    {finished.map((tournament) => (
                      <TournamentRow
                        key={tournament.id}
                        tournament={tournament}
                      />
                    ))}
                  </Card>
                </section>
              )}
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

/**
 * The directory's own card: a `.wash` header in the host club's colour, the
 * discipline as a real ball, then the facts a card-grid reader wants — name,
 * club, format, category, entrants.
 */
export function TournamentCard({
  tournament,
  index,
}: {
  tournament: PublicTournamentListItem;
  index: number;
}) {
  const { t } = useT();
  const live = isLive(tournament.status);

  return (
    <Link
      to="/tournaments/$tournamentId"
      params={{ tournamentId: String(tournament.id) }}
      data-ball={tournament.club?.theme_color}
      style={{ "--i": index } as CSSProperties}
      className="pop lift group flex flex-col overflow-hidden rounded-card border border-hairline bg-felt"
    >
      <div className="wash flex items-center justify-between px-4 py-3 transition-[filter] duration-300 group-hover:saturate-150">
        <DisciplineBall
          discipline={tournament.discipline}
          className="h-10 w-10 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12"
        />
        {live && (
          <span className="flex items-center gap-1.5 rounded-full bg-pocket/70 px-2 py-1 font-mono text-caption font-semibold text-strike">
            <span
              className="live-dot h-1.5 w-1.5 rounded-full bg-strike"
              aria-hidden
            />
            {t("tournaments.status.running")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4">
        <h3 className="truncate text-h4 font-semibold text-ink transition-colors duration-150 group-hover:text-strike">
          {tournament.name}
        </h3>
        {tournament.club && (
          <p className="flex items-center gap-1.5 text-caption text-ink-soft">
            <Avatar
              name={tournament.club.name}
              url={tournament.club.logo_url}
              mark
              className="h-4 w-4"
            />
            <span className="truncate">{tournament.club.name}</span>
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-caption text-ink-faint">
          <span className="rounded-control border border-hairline bg-pocket px-1.5 py-0.5 font-mono tracking-[0.06em] text-ink-soft uppercase">
            {t(`tournaments.${FORMAT_KEY[tournament.format]}`)}
          </span>
          {tournament.category === null ? (
            <span>{t("tournaments.combined")}</span>
          ) : (
            <CategoryBadge category={tournament.category} />
          )}
          <span className="ml-auto flex items-center gap-1 font-mono tabular-nums">
            <LuUsers className="h-3.5 w-3.5" aria-hidden />
            {entrants(tournament)}
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * The same tournament as a list row rather than a card, for the archive on
 * this page and the blocks on a club profile and on /search where it is one
 * item among several kinds.
 */
export function TournamentRow({
  tournament,
  hideClub = false,
}: {
  tournament: PublicTournamentListItem;
  /** On a club's own page the club is the page — repeating it in every row is
   *  noise. */
  hideClub?: boolean;
}) {
  const { t } = useT();

  return (
    <Link
      to="/tournaments/$tournamentId"
      params={{ tournamentId: String(tournament.id) }}
      className="flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 hover:bg-felt-raised"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-body text-ink">{tournament.name}</p>
        <p className="mt-0.5 truncate text-caption text-ink-faint">
          {!hideClub && tournament.club ? `${tournament.club.name} · ` : null}
          {t(`tournaments.status.${tournament.status}`)}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1 font-mono text-caption tabular-nums text-ink-faint">
        <LuUsers className="h-3.5 w-3.5" aria-hidden />
        {entrants(tournament)}
      </span>
    </Link>
  );
}
