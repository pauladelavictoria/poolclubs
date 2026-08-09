import { useState } from "react";
import { Link } from "react-router-dom";
import { LuPlus } from "react-icons/lu";
import { useGetGames } from "@/hooks/useGetGames";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import PageHeader from "@/components/PageHeader";
import GamesList from "@/components/GamesList";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useT } from "@/i18n";

const FILTER_ALL = "";
const PAGE_SIZE = 50;

export default function GamesPage() {
  const { t } = useT();
  const [playerFilter, setPlayerFilter] = useState<string>(FILTER_ALL);
  const [categoryFilter, setCategoryFilter] = useState<string>(FILTER_ALL);
  const [page, setPage] = useState(1);

  const { data: gamesData, isLoading: gamesLoading } = useGetGames({
    page,
    pageSize: PAGE_SIZE,
    playerName: playerFilter,
    category: categoryFilter ? Number(categoryFilter) : undefined,
  });
  const games = gamesData?.games ?? [];
  const totalCount = gamesData?.totalCount ?? 0;
  const { data: players } = useGetPlayers();

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <>
      <PageHeader title={t("games.title")}>
        <Link
          to="/games/new"
          className={buttonClasses({ size: "sm", className: "shrink-0" })}
        >
          <LuPlus className="h-4 w-4" aria-hidden />
          {t("games.add")}
        </Link>
      </PageHeader>

      <div className="mx-auto max-w-5xl px-3 py-4">
        {/* Filters are a toolbar, not the content: compact, left-aligned, and
            sized to their labels. Two half-width 40px selects made choosing a
            filter look like the main task on the page. */}
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-3 py-2.5">
            <Select
              size="sm"
              value={playerFilter}
              onChange={(e) => {
                setPlayerFilter(e.target.value);
                setPage(1);
              }}
              className="max-w-[12rem]"
              aria-label={t("games.filterByPlayer")}
            >
              <option value={FILTER_ALL}>{t("games.allPlayers")}</option>
              {players?.map((player) => (
                <option key={player.id} value={player.name}>
                  {player.name}
                </option>
              ))}
            </Select>

            <Select
              size="sm"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
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

          <div className="p-3">
            {gamesLoading ? (
              <SkeletonRows rows={8} />
            ) : (
              <>
                <GamesList games={games} showDates />

                {totalCount > PAGE_SIZE && (
                  <div className="mt-5 flex items-center justify-center gap-4 border-t border-hairline pt-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page * PAGE_SIZE >= totalCount}
                    >
                      {t("common.next")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
