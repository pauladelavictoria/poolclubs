import { useMemo, useState } from "react";
import { LuUsers } from "react-icons/lu";
import { usePlayers } from "@/hooks/usePlayers";
import { useWhoIsHere } from "@/hooks/useNight";
import { useGames } from "@/hooks/useGames";
import { useEloRanking } from "@/hooks/useEloRanking";
import PageTitle from "@/components/layout/PageTitle";
import { Card } from "@/components/ui/Card";
import { cardClasses } from "@/components/ui/cardStyles";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { CATEGORIES, type Category } from "@/types";
import { useT } from "@/i18n";
import { type Record_, PlayerCard } from "@/components/players/PlayerCard";

type SortMode = "here" | "name" | "category";

/**
 * The roster as cards: who is in the club and how often they win. Club settings
 * still owns adding, approving and removing — this page is read-only, so it can
 * be the one every member lands on from the nav.
 */
export default function PlayersPage() {
  const { t } = useT();
  const [sort, setSort] = useState<SortMode>("name");
  const here = useWhoIsHere();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: players, isLoading: playersLoading } = usePlayers();
  const { data: gamesData, isLoading: gamesLoading } = useGames({});
  // Same hook and same query key as the global ranking, so the win rate on a
  // card is the same number the standings computed — and costs no extra fetch.
  const ranking = useEloRanking({ games: gamesData?.games ?? [], players });

  const records = useMemo(() => {
    const byId = new Map<number, Record_>();
    for (const entry of ranking ?? [])
      byId.set(entry.playerId, {
        played: entry.gamesPlayed,
        won: entry.gamesWon,
      });
    return byId;
  }, [ranking]);

  const filteredPlayers = useMemo(() => {
    const roster = players ?? [];
    if (!searchQuery.trim()) return roster;
    const q = searchQuery.toLowerCase();
    return roster.filter((p) => p.name.toLowerCase().includes(q));
  }, [players, searchQuery]);

  const hereIds = useMemo(() => new Set(here.map((p) => p.id)), [here]);

  // usePlayers already orders by name, so alphabetical is the list as it
  // arrives; grouping is what the other modes add.
  const sections = useMemo(() => {
    const roster = filteredPlayers;
    if (sort === "name")
      return [{ key: "all", heading: null, players: roster }];

    if (sort === "here")
      return [
        {
          key: "here",
          heading: t("tonight.hereNow"),
          players: roster.filter((p) => hereIds.has(p.id)),
        },
        {
          key: "away",
          heading: t("tonight.notHere"),
          players: roster.filter((p) => !hereIds.has(p.id)),
        },
      ].filter((section) => section.players.length > 0);

    return CATEGORIES.map((cat: Category) => ({
      key: String(cat),
      heading: t(`category.${cat}`),
      players: roster.filter((p) => p.category === cat),
    })).filter((section) => section.players.length > 0);
  }, [filteredPlayers, sort, hereIds, t]);

  const isLoading = playersLoading || gamesLoading;

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        <PageTitle title={t("players.title")} />
        <Card className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
          <h2 className="flex items-baseline gap-2 pl-1 text-h4 font-semibold text-ink">
            {t("club.membersTitle")}
            {players?.length ? (
              <span className="text-caption font-normal tabular-nums text-ink-faint">
                {players.length}
              </span>
            ) : null}
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 md:flex-grow md:justify-end">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t("players.searchPlaceholder")}
              className="w-full sm:max-w-xs"
            />
            <Segmented
              label={t("players.sort")}
              value={sort}
              onChange={setSort}
              options={[
                { value: "name", label: t("players.alphabetical") },
                { value: "here", label: t("tonight.hereNow") },
                { value: "category", label: t("ranking.byCategory") },
              ]}
            />
          </div>
        </Card>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={cardClasses({ className: "p-4" })}>
                <Skeleton className="h-10 w-2/3" />
                <Skeleton className="mt-4 h-8 w-1/2" />
              </div>
            ))}
          </div>
        ) : sections.length === 0 ? (
          <Card>
            <EmptyState
              icon={<LuUsers className="h-5 w-5" />}
              title={
                searchQuery
                  ? t("players.noResultsFiltered")
                  : t("players.emptyTitle")
              }
              hint={
                searchQuery
                  ? t("players.noResultsFilteredHint")
                  : t("players.emptyHint")
              }
              action={
                searchQuery ? (
                  <Button
                    variant="secondary"
                    onClick={() => setSearchQuery("")}
                  >
                    {t("common.clearFilters")}
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : (
          sections.map((section) => (
            <section key={section.key} className="space-y-3">
              {section.heading && (
                <div className="flex items-center justify-between gap-3 px-1">
                  <h3 className="text-h3 font-semibold text-ink">
                    {section.heading}
                  </h3>
                  <span className="font-mono text-caption tabular-nums text-ink-faint">
                    {t("ranking.playersCount", { n: section.players.length })}
                  </span>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.players.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    record={records.get(player.id)}
                    isHere={hereIds.has(player.id)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
