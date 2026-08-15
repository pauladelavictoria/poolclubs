import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { LuUsers } from "react-icons/lu";
import PublicShell, { CtaBand } from "@/components/PublicShell";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryBadge } from "@/components/ui/Ball";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterGroup, FilterMenu } from "@/components/ui/FilterMenu";
import { FilterPills } from "@/components/ui/FilterPills";
import { Pager } from "@/components/ui/Pager";
import { Segmented } from "@/components/ui/Segmented";
import { PUBLIC_PAGE_SIZE, publicPlayersQuery } from "@/queries/public";
import type { PublicPlayerWithClub } from "@/queries/public";
import type { Category } from "@/types";
import { useT } from "@/i18n";

const route = getRouteApi("/_public/players/");

const CATEGORIES: Category[] = [1, 2, 3];

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

  // Derived from the page already on hand, not a second query — every club any
  // of these players plays for, in first-seen order.
  const clubsPlayed = Array.from(
    new Map(
      data.players.filter((p) => p.club).map((p) => [p.club!.id, p.club!]),
    ).values(),
  );

  return (
    <>
      <section>
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="text-display leading-[1.05] font-semibold tracking-tighter text-ink">
            {t("public.publicPlayers.title")}
          </h1>
          <p className="mt-4 max-w-[46ch] text-h4 text-ink-soft">
            {t("public.publicPlayers.subtitle")}
          </p>
        </div>
      </section>

      <PublicShell>
        <div className="sticky top-0 z-10 -mx-4 mt-8 bg-pocket/90 px-4 py-3 backdrop-blur-lg sm:-mx-6 sm:px-6">
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
            <span className="shrink-0 font-mono text-caption tabular-nums text-ink-faint">
              {t("ranking.playersCount", { n: data.totalCount })}
            </span>
          </div>
        </div>

        {data.players.length === 0 ? (
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
              const rows = data.players.filter((p) => p.category === c);
              if (rows.length === 0) return null;
              return (
                <div key={c} className="mt-8 first:mt-0">
                  <h3 className="flex items-center gap-2 px-1 pb-2 text-h4 font-semibold text-ink">
                    {t(`category.${c}`)}
                  </h3>
                  <div className="divide-y divide-hairline">
                    {rows.map((player) => (
                      <PlayerRow key={player.id} player={player} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 divide-y divide-hairline">
            {groupByLetter(data.players).map(([letter, rows]) => (
              <div key={letter}>
                <h3 className="px-1 pt-5 pb-1.5 font-mono text-caption font-semibold text-ink-faint first:pt-0">
                  {letter}
                </h3>
                {rows.map((player) => (
                  <PlayerRow key={player.id} player={player} />
                ))}
              </div>
            ))}
          </div>
        )}

        {data.players.length > 0 && (
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
function groupByLetter(players: PublicPlayerWithClub[]) {
  const groups = new Map<string, PublicPlayerWithClub[]>();
  for (const player of players) {
    const letter = player.name.charAt(0).toUpperCase();
    const group = groups.get(letter);
    if (group) group.push(player);
    else groups.set(letter, [player]);
  }
  return Array.from(groups.entries());
}

/** No win rate on this row, unlike the club's own roster: that figure needs the
 *  club's whole game history, and a page of thirty players from thirty clubs
 *  cannot fetch thirty histories to print one number each. */
function PlayerRow({ player }: { player: PublicPlayerWithClub }) {
  return (
    <Link
      to="/players/$playerId"
      params={{ playerId: String(player.id) }}
      data-ball={player.club?.theme_color}
      className="group flex items-center gap-3 rounded-control px-2 py-2.5 transition-colors duration-150 hover:bg-felt-raised"
    >
      <Avatar
        name={player.name}
        url={player.avatar_url}
        seed={player.id}
        className="h-11 w-11"
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-body font-medium text-ink transition-colors duration-150 group-hover:text-strike">
          {player.name}
        </h3>
        {player.club && (
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-caption text-ink-faint">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full bg-club"
              aria-hidden
            />
            {player.club.name}
          </p>
        )}
      </div>
      <CategoryBadge category={player.category} />
    </Link>
  );
}
