import { useSuspenseQuery } from "@tanstack/react-query";
import { cardClasses } from "@/components/ui/cardStyles";
import { Link, getRouteApi } from "@tanstack/react-router";
import { LuCalendar, LuNetwork, LuUsers } from "react-icons/lu";
import PublicShell, { CtaBand } from "@/components/layout/PublicShell";
import PublicPageTitle from "@/components/layout/PublicPageTitle";
import { Avatar } from "@/components/ui/Avatar";
import { DisciplineBall } from "@/components/ui/Ball";
import { Card } from "@/components/ui/Card";
import TournamentPodium from "@/components/tournaments/TournamentPodium";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterGroup, FilterMenu } from "@/components/ui/FilterMenu";
import { FilterPills } from "@/components/ui/FilterPills";
import { Pager } from "@/components/ui/Pager";
import { SearchInput } from "@/components/ui/SearchInput";
import { useDebouncedQuery } from "@/hooks/useDebouncedQuery";
import { eventDates } from "@/libs/algorithms/eventDates";
import { placings, resolveBracket } from "@/libs/algorithms/bracket";
import { leaguePodium, standings } from "@/libs/algorithms/leagueTable";
import { PUBLIC_PAGE_SIZE } from "@/queries/public/shared";
import {
  publicTournamentsQuery,
  type PublicTournamentListItem,
} from "@/queries/public/tournaments";
import {
  DISCIPLINES,
  FORMAT_KEY,
  type Discipline,
  type TournamentFormat,
  type TournamentStatus,
} from "@/types";
import { useT, type Key } from "@/i18n";

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

/**
 * The directory's own card: a `.wash` header in the host club's colour, the
 * discipline as a real ball, then the facts a card-grid reader wants — name,
 * club, format, category, entrants.
 */
export function TournamentCard({
  tournament,
  hideClub = false,
}: {
  tournament: PublicTournamentListItem;
  /** On a club's own page the club is the page — repeating it on every card is
   *  noise, the same as it is on TournamentRow. */
  hideClub?: boolean;
}) {
  const { t, locale } = useT();
  const live = isLive(tournament.status);
  const when = eventDates(tournament.starts_on, tournament.ends_on, locale);

  return (
    <Link
      to="/tournaments/$tournamentId"
      params={{ tournamentId: String(tournament.id) }}
      className={cardClasses({
        className: "lift group flex flex-col overflow-hidden",
      })}
    >
      {/* No colour band over the card. It was a block of tint carrying one ball
          and, sometimes, one pill — art where the reader wanted the name, and
          on a card with no date it left half the tile empty. Everything about
          the tournament is a line of text inside instead. */}
      <div className="flex flex-1 flex-col px-4 pt-4 pb-4">
        <div className="flex items-start gap-3">
          {/* The name leads. The discipline ball used to, and a 32px ball over
              a 16px club logo made a left edge of two different circles that
              lined up with nothing; the ball now sits in the footer, at the
              same size as the club's, where it is one of the facts rather than
              the first thing read.

              Two lines rather than one truncated: a tournament's name is how
              somebody recognises it, and "Torneo apertura temporada 2…" is not
              a name. */}
          <h3 className="line-clamp-2 min-w-0 flex-1 text-h4 font-semibold text-ink transition-colors duration-150 group-hover:text-strike">
            {tournament.name}
          </h3>
          {live && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-strike-tint px-2 py-0.5 font-mono text-caption font-semibold text-strike">
              <span
                className="live-dot h-1.5 w-1.5 rounded-full bg-strike"
                aria-hidden
              />
              {t("tournaments.status.running")}
            </span>
          )}
        </div>
        {/* Where and when, in a slot of a fixed height whether or not either
            exists. Both are optional — most tournaments have no date until an
            organiser sets one — and letting the block collapse is what put the
            bottom row of every tile on a different line from its neighbour's. */}
        <div
          className={`mt-3 mb-3 space-y-2 ${hideClub ? "min-h-6" : "min-h-14"}`}
        >
          {!hideClub && tournament.club && (
            <p className="flex items-center gap-1.5 text-caption text-ink-soft">
              <Avatar
                name={tournament.club.name}
                url={tournament.club.logo_url}
                mark
                className="h-5 w-5"
              />
              <span className="truncate">{tournament.club.name}</span>
            </p>
          )}
          {when && (
            <p className="flex items-center gap-1.5 text-caption text-ink-soft">
              {/* Boxed to the width of the circle above it, so the date's text
                  starts on the same line as the club's name. */}
              <LuCalendar
                className="h-3.5 w-5 shrink-0 text-ink-faint"
                aria-hidden
              />
              <span className="truncate">{when}</span>
            </p>
          )}
        </div>
        {/* The bottom of the card, as one block: the podium stands on the
            footer's rule, and the rule lands on the same line on every tile
            whether or not there is a podium above it. */}
        <div className="mt-auto">
          <CardPodium tournament={tournament} />
          {/* One line of plain text, not two badges and a label. The format and
              the category are facts of the same weight as "all divisions",
              which never had a box around it — three different chromes on one
              row was most of the noise on these cards, and the boxes were also
              what made the row sit at a different height on every tile. */}
          {/* No top margin: the plinths stand ON this rule. The block above
              is what holds the card's spacing, and `mt-auto` on the block is
              what keeps the rule on the same line across a row. */}
          <div className="flex items-center gap-2 border-t border-hairline pt-3 text-caption text-ink-faint">
            <DisciplineBall
              discipline={tournament.discipline}
              className="h-5 w-5 shrink-0"
            />
            <span className="min-w-0 truncate">
              {t(`tournaments.${FORMAT_KEY[tournament.format]}`)}
              {" · "}
              {tournament.category === null
                ? t("tournaments.combined")
                : `${t("ranking.categoryShort")} ${t("category.short", { n: tournament.category })}`}
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-1 font-mono tabular-nums">
              <LuUsers className="h-3.5 w-3.5" aria-hidden />
              {entrants(tournament)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/**
 * Who won it, on the card that says it is over — the one fact an archive is
 * read for, and the reason the archive is cards now.
 *
 * The tournament's own podium at tile size (`compact`): the same three steps,
 * faces only. Same reading too — see PODIUM_COLS for what it costs (fixtures,
 * not games).
 */
function CardPodium({ tournament }: { tournament: PublicTournamentListItem }) {
  const matches = tournament.tournament_matches;
  // /search asks for a leaner row, and an unfinished draw has no podium to
  // read: both simply draw nothing.
  if (tournament.status !== "done" || !matches?.length) return null;

  // An entrant whose row was withheld (a claimed guest, a deleted person) has
  // no name to draw and simply is not in the map — the step falls back to a
  // dash rather than dropping out of the podium.
  const byId = new Map(
    (tournament.roster ?? []).flatMap(({ player }) =>
      player?.person ? [[player.id, player.person] as const] : [],
    ),
  );

  const resolved = resolveBracket(matches);
  const places =
    tournament.format === "league"
      ? leaguePodium(standings([...byId.keys()], resolved))
      : placings(resolved);

  if (places.first === null) return null;

  return (
    // Padding on top only: the plinths sit straight on the footer's rule,
    // which is the floor of this podium.
    <div className="pt-3">
      <TournamentPodium places={places} byId={byId} compact />
    </div>
  );
}
