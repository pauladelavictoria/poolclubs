import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { LuNetwork, LuUsers } from "react-icons/lu";
import PublicShell from "@/components/PublicShell";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { cardClasses } from "@/components/ui/cardStyles";
import { CategoryBadge } from "@/components/ui/Ball";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterPills } from "@/components/ui/FilterPills";
import { Pager } from "@/components/ui/Pager";
import { SearchInput } from "@/components/ui/SearchInput";
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
  { key: "tournaments.finished", statuses: ["done"] },
];

const RAIL: Record<TournamentStatus, string> = {
  open: "border-l-strike",
  groups: "border-l-strike",
  running: "border-l-strike",
  done: "border-l-hairline-strong",
};

const STATUSES: TournamentStatus[] = ["open", "running", "done"];
const FORMATS: TournamentFormat[] = [
  "double_elim",
  "league",
  "group_knockout",
];

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

  const filtered =
    Boolean(search.q) ||
    Boolean(search.status) ||
    Boolean(search.format) ||
    Boolean(search.discipline);

  return (
    <PublicShell
      title={t("public.publicTournaments.title")}
      subtitle={t("public.publicTournaments.subtitle")}
    >
      <div className="flex flex-col gap-3">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={t("public.publicTournaments.searchPlaceholder")}
          className="w-full sm:max-w-sm"
        />
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
              <section key={key} className="space-y-2">
                <h2 className="px-1 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
                  {t(key)}
                </h2>
                {rows.map((tournament) => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                  />
                ))}
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
    </PublicShell>
  );
}

/**
 * The card from the club's own index, with the club's name added: out here two
 * tournaments called "Winter League" are two different events, and whose they
 * are is the fact that tells them apart.
 */
function TournamentCard({
  tournament,
}: {
  tournament: PublicTournamentListItem;
}) {
  const { t } = useT();

  return (
    <Link
      to="/tournaments/$tournamentId"
      params={{ tournamentId: String(tournament.id) }}
      className={cardClasses({
        interactive: true,
        className: `flex items-start gap-3 border-l-2 px-4 py-3.5 ${RAIL[tournament.status]}`,
      })}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-h4 font-semibold text-ink">
          {tournament.name}
        </p>
        {tournament.club && (
          <p className="mt-1 flex items-center gap-1.5 text-caption text-ink-soft">
            <Avatar
              name={tournament.club.name}
              url={tournament.club.logo_url}
              className="h-4 w-4"
            />
            <span className="truncate">{tournament.club.name}</span>
          </p>
        )}
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-faint">
          <span className="rounded-control border border-hairline bg-pocket px-1.5 py-0.5 font-mono uppercase tracking-[0.06em] text-ink-soft">
            {t(`tournaments.${FORMAT_KEY[tournament.format]}`)}
          </span>
          <span className="truncate">
            {t(`discipline.${tournament.discipline}`)}
            {" · "}
            {t(`tournaments.status.${tournament.status}`)}
          </span>
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {tournament.category === null ? (
          <span className="text-caption text-ink-faint">
            {t("tournaments.combined")}
          </span>
        ) : (
          <CategoryBadge category={tournament.category} />
        )}
        <span className="flex items-center gap-1 font-mono text-caption tabular-nums text-ink-faint">
          <LuUsers className="h-3.5 w-3.5" aria-hidden />
          {entrants(tournament)}
        </span>
      </div>
    </Link>
  );
}

/**
 * The same tournament as a list row rather than a card, for the blocks on a club
 * profile and on /search where it is one item among several kinds.
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
