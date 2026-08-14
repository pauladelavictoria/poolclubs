import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useGetGames } from "@/hooks/useGetGames";
import { useAuth } from "@/hooks/useAuth";
import PageTitle from "@/components/PageTitle";
import ChallengeButton from "@/components/ChallengeButton";
import GamesList from "@/components/GamesList";
import PlayerTabs from "@/components/PlayerTabs";
import { Card, CardHeader } from "@/components/ui/Card";
import { CategoryBadge } from "@/components/ui/Ball";
import { Stat } from "@/components/ui/Stat";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useChartTheme } from "@/libs/chartTheme";
import { getRouteApi } from "@tanstack/react-router";
import { useT } from "@/i18n";
import { AppLink } from "@/components/AppLink";

/** A player's whole history, not a page of it — the charts are cumulative. */
export const PLAYER_GAMES_LIMIT = 1000;

const route = getRouteApi("/app/_authed/$clubSlug/players/$playerId/");

export default function PlayerDetailPage() {
  const { playerId: playerIdParam } = route.useParams();
  const playerId = Number(playerIdParam);
  const { t, locale } = useT();
  const chart = useChartTheme();

  const { user } = useAuth();
  const { data: players, isLoading: isLoadingPlayers } = useGetPlayers();
  const player = players?.find((p) => p.id === playerId);
  const isOwnProfile = !!user && player?.user_id === user.id;

  const { data: gamesData, isLoading: isLoadingGames } = useGetGames({
    playerId,
    pageSize: PLAYER_GAMES_LIMIT,
  });

  const stats = useMemo(() => {
    if (!player || !gamesData?.games) return null;

    const games = [...gamesData.games].reverse(); // oldest first

    let totalGames = 0;
    let gamesWon = 0;
    let racksWon = 0;
    let racksLost = 0;

    const chartData = games.map((game, index) => {
      totalGames++;
      // By id, matching the filter that fetched these rows. On names, a renamed
      // player matched neither side and silently scored nothing.
      const isPlayer1 =
        game.player_1_id === player.id || game.player_1b_id === player.id;
      const isPlayer2 =
        game.player_2_id === player.id || game.player_2b_id === player.id;

      const p1Score = game.player_1_score;
      const p2Score = game.player_2_score;

      let wonGame = false;
      if (isPlayer1) {
        wonGame = p1Score > p2Score;
        racksWon += p1Score;
        racksLost += p2Score;
      } else if (isPlayer2) {
        wonGame = p2Score > p1Score;
        racksWon += p2Score;
        racksLost += p1Score;
      }

      if (wonGame) gamesWon++;

      const gameWinRate = (gamesWon / totalGames) * 100;
      const rackWinRate =
        racksWon + racksLost > 0
          ? (racksWon / (racksWon + racksLost)) * 100
          : 0;

      return {
        gameIndex: index + 1,
        date: new Date(game.created_at).toLocaleString(locale),
        gameWinRate: parseFloat(gameWinRate.toFixed(1)),
        rackWinRate: parseFloat(rackWinRate.toFixed(1)),
        gamesWon,
        racksWon,
      };
    });

    return {
      totalGames,
      gamesWon,
      gamesLost: totalGames - gamesWon,
      racksWon,
      racksLost,
      winRate:
        totalGames > 0 ? ((gamesWon / totalGames) * 100).toFixed(1) : "0",
      rackWinRate:
        racksWon + racksLost > 0
          ? ((racksWon / (racksWon + racksLost)) * 100).toFixed(1)
          : "0",
      chartData,
    };
  }, [player, gamesData, locale]);

  if (isLoadingPlayers || isLoadingGames) {
    return (
      <>
        <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
          <PageTitle title={t("players.detailTitle")} />
          <Card className="p-3">
            <SkeletonRows rows={6} />
          </Card>
        </div>
      </>
    );
  }

  if (!player) {
    return (
      <>
        <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
          <PageTitle title={t("players.detailTitle")} />
          <Card>
            <EmptyState
              title={t("players.notFound")}
              hint={t("players.notFoundHint")}
              action={
                <AppLink
                  to="/app/$clubSlug/players"
                  className={buttonClasses({ variant: "secondary" })}
                >
                  {t("players.title")}
                </AppLink>
              }
            />
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        <PageTitle title={player.name}>
          <CategoryBadge category={player.category} full />
        </PageTitle>
        {user && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <PlayerTabs playerId={player.id} isOwnProfile={isOwnProfile} />
            </div>
            <ChallengeButton toPlayerId={player.id} />
          </div>
        )}

        {stats && stats.totalGames > 0 ? (
          <>
            <Card className="grid grid-cols-2 gap-5 p-5">
              <Stat
                label={t("players.gamesWon")}
                value={`${stats.winRate}%`}
                delta={t("players.ofTotal", {
                  n: stats.gamesWon,
                  total: stats.totalGames,
                })}
                tone="good"
              />
              <Stat
                label={t("players.racksWon")}
                value={`${stats.rackWinRate}%`}
                delta={t("players.ofTotal", {
                  n: stats.racksWon,
                  total: stats.racksWon + stats.racksLost,
                })}
              />
            </Card>

            <Card className="overflow-hidden">
              <CardHeader title={t("players.winsOverTime")} />
              <div className="h-64 w-full p-3 text-caption md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                    <XAxis
                      dataKey="date"
                      stroke={chart.axis}
                      tick={{ fill: chart.axis, fontSize: 14 }}
                      axisLine={{ stroke: chart.grid }}
                      tickLine={{ stroke: chart.grid }}
                      tickFormatter={(val) => val.split(",")[0]}
                    />
                    <YAxis
                      stroke={chart.axis}
                      tick={{ fill: chart.axis, fontSize: 14 }}
                      domain={[0, 100]}
                      axisLine={{ stroke: chart.grid }}
                      tickLine={{ stroke: chart.grid }}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip
                      contentStyle={chart.tooltip}
                      itemStyle={chart.tooltipItem}
                      formatter={(value) => `${value}%`}
                      itemSorter={(i) => (i.dataKey === "gameWinRate" ? -1 : 1)}
                    />
                    <Line
                      type="step"
                      name={t("players.racks")}
                      dataKey="rackWinRate"
                      stroke={chart.series.racks}
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      dot={false}
                    />
                    <Line
                      type="step"
                      name={t("players.games")}
                      dataKey="gameWinRate"
                      stroke={chart.series.games}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader title={t("games.history")} />
              <div className="p-3">
                <GamesList
                  games={gamesData?.games ?? []}
                  playerId={player.id}
                  showDates
                />
              </div>
            </Card>
          </>
        ) : (
          <Card>
            <EmptyState
              title={t("players.noGamesTitle")}
              hint={t("players.noGamesHint", { name: player.name })}
              action={
                <AppLink to="/app/$clubSlug/games/new" className={buttonClasses({})}>
                  {t("games.add")}
                </AppLink>
              }
            />
          </Card>
        )}
      </div>
    </>
  );
}
