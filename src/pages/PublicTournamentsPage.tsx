import type { CSSProperties } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { LuChevronDown, LuNetwork, LuUsers } from "react-icons/lu";
import PublicShell, { CtaBand } from "@/components/PublicShell";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryBadge, DisciplineBall } from "@/components/ui/Ball";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterPills } from "@/components/ui/FilterPills";
import { Pager } from "@/components/ui/Pager";
import { SearchInput } from "@/components/ui/SearchInput";
import { Shot } from "@/components/ui/Shot";
import { useDebouncedQuery } from "@/libs/useDebouncedQuery";
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
const FORMATS: TournamentFormat[] = [
  "double_elim",
  "league",
  "group_knockout",
];

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

  const [q, setQ] = useDebouncedQuery(search.q ?? "", (value) =>
    navigate({
      search: { ...search, q: value || undefined, page: 1 },
      replace: true,
    }),
  );

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

  const advancedCount = (search.format ? 1 : 0) + (search.discipline ? 1 : 0);

  // The one live event worth a feature band — hidden under any filter, since
  // "what's live right now" stops being true of the filtered set.
  const featured = !filtered ? all.find((x) => isLive(x.status)) : undefined;

  return (
    <PublicShell>
      <section className="relative mt-6 overflow-hidden rounded-sheet border border-hairline-strong bg-felt">
        <Shot
          name="hero-tournaments"
          seed="tournaments-hero"
          size={[1600, 900]}
          alt=""
          priority
          className="absolute inset-0 h-full opacity-70"
        />
        <div className="scrim absolute inset-0" />
        <div className="relative flex min-h-[200px] flex-col justify-end gap-2 p-6 sm:min-h-[260px] sm:p-8">
          <h1 className="text-h1 font-semibold tracking-tight text-ink md:text-display">
            {t("public.publicTournaments.title")}
          </h1>
          <p className="max-w-[52ch] text-body text-ink-soft sm:text-h4">
            {t("public.publicTournaments.subtitle")}
          </p>
        </div>
      </section>

      {featured && (
        <Link
          to="/tournaments/$tournamentId"
          params={{ tournamentId: String(featured.id) }}
          data-ball={featured.club?.theme_color}
          className="wash lift group relative mt-8 flex flex-col gap-4 overflow-hidden rounded-sheet border border-hairline-strong p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
        >
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pocket/70 px-2 py-1 font-mono text-caption font-semibold text-strike">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-strike" aria-hidden />
              {t("tournaments.status.running")}
            </span>
            <h2 className="mt-3 truncate text-h2 font-semibold tracking-tight text-ink transition-colors duration-150 group-hover:text-strike">
              {featured.name}
            </h2>
            {featured.club && (
              <p className="mt-1 flex items-center gap-1.5 text-body text-ink-soft">
                <Avatar
                  name={featured.club.name}
                  url={featured.club.logo_url}
                  className="h-5 w-5"
                />
                {featured.club.name}
              </p>
            )}
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <span className="font-mono text-display font-semibold tabular-nums text-ink">
              {entrants(featured)}
            </span>
            <p className="text-caption text-ink-faint">
              {t("tournaments.entrants", { n: entrants(featured) })}
            </p>
          </div>
        </Link>
      )}

      <div className="sticky top-16 z-10 -mx-4 mt-10 border-y border-hairline bg-pocket/90 px-4 py-3 backdrop-blur-lg sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder={t("public.publicTournaments.searchPlaceholder")}
            className="w-full sm:max-w-sm"
          />
          <div className="flex items-center gap-2">
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
            <details className="group relative ml-auto shrink-0">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-control border border-hairline px-2.5 py-1.5 text-caption text-ink-soft select-none hover:text-ink [&::-webkit-details-marker]:hidden">
                {t("public.filters.more")}
                {advancedCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-strike px-1 font-mono text-[11px] font-semibold text-pocket">
                    {advancedCount}
                  </span>
                )}
                <LuChevronDown
                  className="h-3.5 w-3.5 transition-transform duration-150 group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="absolute right-4 z-10 mt-2 flex w-[min(90vw,22rem)] flex-col gap-3 rounded-card border border-hairline-strong bg-felt p-3 shadow-lg sm:right-6">
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
              </div>
            </details>
          </div>
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
          <div className="mt-6 space-y-8">
            {grouped.map(({ key, rows }) => (
              <section key={key}>
                <h2 className="px-1 pb-2 text-caption font-medium tracking-[0.08em] text-ink-faint uppercase">
                  {t(key)}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
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
                <h2 className="px-1 pb-2 text-caption font-medium tracking-[0.08em] text-ink-faint uppercase">
                  {t("tournaments.finished")}
                </h2>
                <Card className="divide-y divide-hairline">
                  {finished.map((tournament) => (
                    <TournamentRow key={tournament.id} tournament={tournament} />
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
      className="rise lift group flex flex-col overflow-hidden rounded-card border border-hairline bg-felt"
    >
      <div className="wash flex items-center justify-between px-4 py-3">
        <DisciplineBall discipline={tournament.discipline} className="h-7 w-7" />
        {live && (
          <span className="flex items-center gap-1.5 rounded-full bg-pocket/70 px-2 py-1 font-mono text-caption font-semibold text-strike">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-strike" aria-hidden />
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
          {!hideClub && tournament.club
            ? `${tournament.club.name} · `
            : null}
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
