import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LuUsers } from "react-icons/lu";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useGetGames } from "@/hooks/useGetGames";
import { useEloRanking } from "@/hooks/useEloRanking";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Category, Player } from "@/types";
import { useT } from "@/i18n";

type SortMode = "name" | "category";

const CATEGORIES = [1, 2, 3] as const;

/** Win rate and matches played, keyed by player. Anyone with no games is absent
 *  rather than zero, so the card can say "no matches" instead of "0%". */
type Record_ = { played: number; won: number };

function PlayerCard({
  player,
  record,
}: {
  player: Player;
  record?: Record_;
}) {
  const { t } = useT();

  return (
    <Link
      to={`/app/players/${player.id}`}
      className="flex flex-col gap-3 rounded-card border border-hairline bg-felt p-4 transition-[background-color,border-color] duration-150 hover:border-hairline-strong hover:bg-felt-raised"
    >
      <div className="flex items-center gap-3">
        <Avatar
          name={player.name}
          url={player.avatar_url}
          className="h-10 w-10"
        />
        <div className="min-w-0">
          <h3 className="truncate text-body font-medium text-ink">
            {player.name}
          </h3>
          <p className="truncate text-caption text-ink-faint">
            {t(`category.${player.category}`)}
          </p>
        </div>
      </div>

      {/* The figure is why this page exists, so it leads on its own line rather
          than trailing the name as another caption. */}
      <div className="mt-auto">
        <div className="text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
          {t("players.winRate")}
        </div>
        {record ? (
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="font-mono text-h2 font-semibold tabular-nums text-pot">
              {Math.round((record.won / record.played) * 100)}%
            </span>
            <span className="text-caption text-ink-faint">
              {t("players.ofTotal", { n: record.won, total: record.played })}
            </span>
          </div>
        ) : (
          <div className="mt-0.5 text-body text-ink-faint">
            {t("players.noGamesShort")}
          </div>
        )}
      </div>
    </Link>
  );
}

/**
 * The roster as cards: who is in the club and how often they win. Club settings
 * still owns adding, approving and removing — this page is read-only, so it can
 * be the one every member lands on from the nav.
 */
export default function PlayersPage() {
  const { t } = useT();
  const [sort, setSort] = useState<SortMode>("name");

  const { data: players, isLoading: playersLoading } = useGetPlayers();
  const { data: gamesData, isLoading: gamesLoading } = useGetGames({});
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

  // useGetPlayers already orders by name, so alphabetical is the list as it
  // arrives; grouping is what the other mode adds.
  const sections = useMemo(() => {
    const roster = players ?? [];
    if (sort === "name") return [{ key: "all", heading: null, players: roster }];
    return CATEGORIES.map((cat: Category) => ({
      key: String(cat),
      heading: t(`category.${cat}`),
      players: roster.filter((p) => p.category === cat),
    })).filter((section) => section.players.length > 0);
  }, [players, sort, t]);

  const isLoading = playersLoading || gamesLoading;

  return (
    <>
      <PageHeader
        title={t("players.title")}
        subtitle={
          players?.length
            ? t("ranking.playersCount", { n: players.length })
            : undefined
        }
      />

      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        <Card className="flex items-center justify-between gap-3 p-3">
          <h2 className="pl-1 text-h4 font-semibold text-ink">
            {t("club.membersTitle")}
          </h2>
          <Segmented
            label={t("players.sort")}
            value={sort}
            onChange={setSort}
            options={[
              { value: "name", label: t("players.alphabetical") },
              { value: "category", label: t("ranking.byCategory") },
            ]}
          />
        </Card>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="rounded-card border border-hairline bg-felt p-4"
              >
                <Skeleton className="h-10 w-2/3" />
                <Skeleton className="mt-4 h-8 w-1/2" />
              </div>
            ))}
          </div>
        ) : sections.length === 0 ? (
          <Card>
            <EmptyState
              icon={<LuUsers className="h-5 w-5" />}
              title={t("players.emptyTitle")}
              hint={t("players.emptyHint")}
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
