import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { LuUsers } from "react-icons/lu";
import PublicShell, { CtaBand } from "@/components/layout/PublicShell";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterGroup, FilterMenu } from "@/components/ui/FilterMenu";
import { FilterPills } from "@/components/ui/FilterPills";
import { Pager } from "@/components/ui/Pager";
import { SearchInput } from "@/components/ui/SearchInput";
import { Segmented } from "@/components/ui/Segmented";
import { useDebouncedQuery } from "@/libs/useDebouncedQuery";
import { PUBLIC_PAGE_SIZE, publicPlayersQuery } from "@/queries/public";
import type { PublicPersonWithClubs } from "@/queries/public";
import { CATEGORIES } from "@/types";
import { useT } from "@/i18n";

const route = getRouteApi("/_public/players/");

/** Cards are narrow enough to fit two or three across, so a page of thirty
 *  people is scanned rather than scrolled. */
const GRID =
  "grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";

/**
 * Every listed player, across every public club.
 *
 * Cross-club on purpose: a name is the thing people search for, and which club
 * someone plays for is the answer rather than the question. So the club is on
 * each card as a fact, and also available as a filter for anyone who came here
 * knowing it.
 */
export default function PublicPlayersPage() {
  const { t } = useT();
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const { data } = useSuspenseQuery(publicPlayersQuery(search));

  // See the route: the validator leaves these off so /players does not redirect
  // to its own canonical form.
  const sort = search.sort ?? "name";
  const page = search.page ?? 1;

  const filtered = Boolean(search.q ?? search.category ?? search.clubId);

  // `replace`: typing is one intent, not one history entry per pause.
  const [q, setQ] = useDebouncedQuery(search.q ?? "", (value) =>
    navigate({
      search: { ...search, q: value || undefined, page: 1 },
      replace: true,
    }),
  );

  // Derived from the page already on hand, not a second query — every club any
  // of these people plays for, in first-seen order.
  const clubsPlayed = Array.from(
    new Map(
      data.people.flatMap((person) =>
        person.memberships.map((m) => [m.club.id, m.club] as const),
      ),
    ).values(),
  );

  return (
    <>
      <section>
        <div className="px-4 py-6 sm:px-6 sm:py-8">
          <h1 className="text-display leading-[1.05] font-semibold tracking-tighter text-ink">
            {t("public.publicPlayers.title")}
          </h1>
          <p className="mt-2 max-w-[46ch] text-h4 text-ink-soft">
            {t("public.publicPlayers.subtitle")}
          </p>
        </div>
      </section>

      <PublicShell>
        <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-10 -mx-4 mt-8 bg-pocket/90 px-4 py-3 backdrop-blur-lg sm:-mx-6 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <FilterMenu
              activeCount={
                (sort === "name" ? 0 : 1) + (search.category ? 1 : 0)
              }
            >
              <FilterGroup label={t("players.sort")}>
                <Segmented
                  label={t("players.sort")}
                  value={sort}
                  onChange={(sort) =>
                    navigate({ search: { ...search, sort, page: 1 } })
                  }
                  options={[
                    { value: "name", label: t("players.alphabetical") },
                    { value: "category", label: t("ranking.byCategory") },
                  ]}
                />
              </FilterGroup>
              <FilterGroup label={t("players.category")}>
                <FilterPills
                  label={t("players.category")}
                  anyLabel={t("public.filters.anyDivision")}
                  value={search.category ? String(search.category) : undefined}
                  onChange={(value) =>
                    navigate({
                      search: {
                        ...search,
                        category: value ? Number(value) : undefined,
                        page: 1,
                      },
                    })
                  }
                  options={CATEGORIES.map((c) => ({
                    value: String(c),
                    label: t(`category.${c}`),
                  }))}
                />
              </FilterGroup>
            </FilterMenu>
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder={t("players.searchPlaceholder")}
              className="min-w-0 flex-1"
            />
            <span className="shrink-0 font-mono text-caption tabular-nums text-ink-faint">
              {t("ranking.playersCount", { n: data.totalCount })}
            </span>
          </div>
        </div>

        {data.people.length === 0 ? (
          <Card className="mt-4">
            <EmptyState
              icon={<LuUsers className="h-5 w-5" aria-hidden />}
              title={
                filtered
                  ? t("players.noResultsFiltered")
                  : t("public.publicPlayers.emptyTitle")
              }
              hint={
                filtered
                  ? t("players.noResultsFilteredHint")
                  : t("public.publicPlayers.emptyHint")
              }
            />
          </Card>
        ) : sort === "category" ? (
          <div className="mt-6">
            {CATEGORIES.map((c) => {
              // Division is per membership now, so a person lands in the
              // group of their strongest one rather than in three groups.
              const rows = data.people.filter(
                (p) => Math.min(...p.memberships.map((m) => m.category)) === c,
              );
              if (rows.length === 0) return null;
              return (
                <div key={c} className="mt-10 first:mt-0">
                  <h3 className="flex items-center gap-2 px-1 pb-2 text-h4 font-semibold text-ink">
                    {t(`category.${c}`)}
                  </h3>
                  <div className={GRID}>
                    {rows.map((person) => (
                      <PersonRow key={person.id} person={person} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-6">
            {groupByLetter(data.people).map(([letter, rows]) => (
              <div key={letter}>
                <h3 className="px-1 pt-5 pb-1.5 font-mono text-caption font-semibold text-ink-faint first:pt-0">
                  {letter}
                </h3>
                <div className={GRID}>
                  {rows.map((person) => (
                    <PersonRow key={person.id} person={person} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {data.people.length > 0 && (
          <Pager
            page={page}
            pageSize={PUBLIC_PAGE_SIZE}
            totalCount={data.totalCount}
            onPage={(page) => navigate({ search: { ...search, page } })}
          />
        )}

        {clubsPlayed.length > 0 && (
          <section className="mt-12">
            <h2 className="text-h3 font-semibold tracking-tight text-ink">
              {t("public.publicPlayers.clubsRail")}
            </h2>
            <div className="no-bar -mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
              {clubsPlayed.map((club) => (
                <Link
                  key={club.id}
                  to="/clubs/$slug"
                  params={{ slug: club.slug }}
                  data-ball={club.theme_color}
                  className="wash lift flex shrink-0 snap-start items-center gap-2 rounded-full border border-hairline px-3 py-2"
                >
                  <Avatar
                    name={club.name}
                    url={club.logo_url}
                    mark
                    className="h-6 w-6"
                  />
                  <span className="text-caption font-medium text-ink">
                    {club.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <CtaBand />
      </PublicShell>
    </>
  );
}

/** A–Z, in first-seen order (the query already sorts by name), grouped for the
 *  indexed list rather than fetched pre-grouped: the letters are a client-side
 *  read of an already-sorted page, not a second query shape. */
function groupByLetter(people: PublicPersonWithClubs[]) {
  const groups = new Map<string, PublicPersonWithClubs[]>();
  for (const person of people) {
    const letter = person.name.charAt(0).toUpperCase();
    const group = groups.get(letter);
    if (group) group.push(person);
    else groups.set(letter, [person]);
  }
  return Array.from(groups.entries());
}

/**
 * One row per person — every club they play for on the same card.
 *
 * This row is the reason people exists. It used to take a membership, so the
 * same human in three clubs was three rows, three faces and three profile links
 * that each knew about a third of them.
 *
 * No win rate here, unlike the club's own roster: that figure needs a club's
 * whole game history, and a page of thirty people from thirty clubs cannot fetch
 * thirty histories to print one number each.
 */
function PersonRow({ person }: { person: PublicPersonWithClubs }) {
  // The row's accent takes the first club's, the same compromise the profile
  // hero makes: there is no single colour for somebody who plays in three.
  const [first] = person.memberships;

  return (
    <Link
      to="/players/$playerSlug"
      params={{ playerSlug: person.slug }}
      data-ball={first?.club.theme_color}
      className="group flex items-center gap-2.5 rounded-control border border-hairline px-2.5 py-2 transition-colors duration-150 hover:bg-felt-raised"
    >
      <Avatar
        name={person.name}
        url={person.avatar_url}
        seed={person.id}
        className="h-9 w-9"
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-caption font-medium text-ink transition-colors duration-150 group-hover:text-strike">
          {person.name}
        </h3>
        {/* The club logos, the same pile the club header uses for its roster,
            one size down: at card width the names never fit past the second
            club, and the marks are what people recognise anyway. */}
        <div className="mt-1 flex -space-x-1.5">
          {person.memberships.map(({ id, club }) => (
            <Avatar
              key={id}
              name={club.name}
              url={club.logo_url}
              mark
              className="h-5 w-5"
            />
          ))}
          <span className="sr-only">
            {person.memberships.map((m) => m.club.name).join(", ")}
          </span>
        </div>
      </div>
    </Link>
  );
}
