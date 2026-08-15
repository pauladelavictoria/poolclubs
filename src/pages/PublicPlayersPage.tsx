import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { LuUsers } from "react-icons/lu";
import PublicShell from "@/components/PublicShell";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { CategoryBadge } from "@/components/ui/Ball";
import { cardClasses } from "@/components/ui/cardStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterPills } from "@/components/ui/FilterPills";
import { Pager } from "@/components/ui/Pager";
import { SearchInput } from "@/components/ui/SearchInput";
import { Segmented } from "@/components/ui/Segmented";
import { useDebouncedQuery } from "@/libs/useDebouncedQuery";
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

  const [q, setQ] = useDebouncedQuery(search.q ?? "", (value) =>
    navigate({
      search: { ...search, q: value || undefined, page: 1 },
      replace: true,
    }),
  );

  const filtered = Boolean(search.q ?? search.category ?? search.clubId);

  return (
    <PublicShell
      title={t("public.publicPlayers.title")}
      subtitle={t("public.publicPlayers.subtitle")}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder={t("public.publicPlayers.searchPlaceholder")}
            className="w-full sm:max-w-sm"
          />
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
        </div>
        <div className="flex items-center justify-between gap-3">
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
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.players.map((player) => (
              <PublicPlayerCard key={player.id} player={player} />
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

/** No win rate on this card, unlike the club's own roster: that figure needs the
 *  club's whole game history, and a page of thirty players from thirty clubs
 *  cannot fetch thirty histories to print one number each. */
function PublicPlayerCard({ player }: { player: PublicPlayerWithClub }) {
  return (
    <Link
      to="/players/$playerId"
      params={{ playerId: String(player.id) }}
      className={cardClasses({
        interactive: true,
        className: "group flex items-center gap-3 p-4",
      })}
    >
      <Avatar
        name={player.name}
        url={player.avatar_url}
        className="h-10 w-10"
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-body font-medium text-ink transition-colors duration-150 group-hover:text-strike">
          {player.name}
        </h3>
        {player.club && (
          <p className="mt-0.5 truncate text-caption text-ink-faint">
            {player.club.name}
          </p>
        )}
      </div>
      <CategoryBadge category={player.category} />
    </Link>
  );
}
