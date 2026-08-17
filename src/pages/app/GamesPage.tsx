import { getRouteApi } from "@tanstack/react-router";
import { LuPlus } from "react-icons/lu";
import { useGetGames } from "@/hooks/useGetGames";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import PageTitle from "@/components/layout/PageTitle";
import GamesList from "@/components/games/GamesList";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useT } from "@/i18n";
import { AppLink } from "@/components/layout/AppLink";

const FILTER_ALL = "";
/** Exported so the route loader fetches the same page the list will show. */
export const PAGE_SIZE = 50;

const route = getRouteApi("/app/_authed/$clubSlug/games/");

export default function GamesPage() {
  const { t } = useT();
  // The filters are in the URL, not in useState. A loader can only key on the
  // URL, so this is what lets the page arrive already fetched — and it makes a
  // filtered view something you can send someone.
  const { page, playerId, category } = route.useSearch();
  const navigate = route.useNavigate();

  /** Changing a filter always goes back to page one; changing the page doesn't. */
  const setFilter = (patch: { playerId?: number; category?: number }) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }) });

  const setPage = (next: number) =>
    navigate({ search: (prev) => ({ ...prev, page: next }) });

  const { data: gamesData, isLoading: gamesLoading } = useGetGames({
    page,
    pageSize: PAGE_SIZE,
    playerId,
    category,
  });
  const games = gamesData?.games ?? [];
  const totalCount = gamesData?.totalCount ?? 0;
  const { data: players } = useGetPlayers();

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <>
      <div className="mx-auto max-w-5xl px-3 py-4">
        <PageTitle title={t("games.title")} className="mb-4">
          <AppLink
            to="/app/$clubSlug/games/new"
            className={buttonClasses({ size: "sm", className: "shrink-0" })}
          >
            <LuPlus className="h-4 w-4" aria-hidden />
            {t("games.add")}
          </AppLink>
        </PageTitle>

        {/* Filters are a toolbar, not the content: compact, left-aligned, and
            sized to their labels. Two half-width 40px selects made choosing a
            filter look like the main task on the page.
            It is a bar on the canvas rather than a card header, because the
            tape below is not inside anything — a card around it would also
            kill the sticky day rules, which need no clipping ancestor. */}
        <div className="rounded-control border border-hairline bg-felt">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
            <Select
              size="sm"
              value={playerId ?? FILTER_ALL}
              onChange={(e) =>
                setFilter({ playerId: Number(e.target.value) || undefined })
              }
              className="max-w-[12rem]"
              aria-label={t("games.filterByPlayer")}
            >
              <option value={FILTER_ALL}>{t("games.allPlayers")}</option>
              {players?.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </Select>

            <Select
              size="sm"
              value={category ?? FILTER_ALL}
              onChange={(e) =>
                setFilter({ category: Number(e.target.value) || undefined })
              }
              aria-label={t("games.filterByCategory")}
            >
              <option value={FILTER_ALL}>{t("games.allCategories")}</option>
              <option value="1">{t("category.1")}</option>
              <option value="2">{t("category.2")}</option>
              <option value="3">{t("category.3")}</option>
            </Select>

            <span className="ml-auto hidden font-mono text-caption tabular-nums text-ink-faint sm:block">
              {t("games.count", { n: totalCount })}
            </span>
          </div>
        </div>

        <div className="mt-4">
          {gamesLoading ? (
            <SkeletonRows rows={8} />
          ) : (
            <>
              <GamesList
                players={players ?? []}
                games={games}
                showDates
                stickyDates
              />

              {totalCount > PAGE_SIZE && (
                <div className="mt-6 flex items-center justify-center gap-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                  >
                    {t("common.previous")}
                  </Button>
                  <span className="font-mono text-caption tabular-nums text-ink-faint">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page * PAGE_SIZE >= totalCount}
                  >
                    {t("common.next")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
