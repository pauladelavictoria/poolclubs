import { useParams, Link } from "react-router-dom";
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
import PageHeader from "@/components/PageHeader";
import GamesList from "@/components/GamesList";
import PlayerTabs from "@/components/PlayerTabs";
import { Card, CardHeader } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { CATEGORY_LABEL } from "@/components/ui/Ball";

/* Chart ink, matched to the theme tokens */
const AXIS = "#8d9793";
const GRID = "rgba(255,255,255,0.07)";
const LINE_GAMES = "#3fbf7f"; // pot green: frames taken
const LINE_RACKS = "#5b9dd9"; // chalk blue: the supporting series

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const playerId = Number(id);

  const { user } = useAuth();
  const { data: players, isLoading: isLoadingPlayers } = useGetPlayers();
  const player = players?.find((p) => p.id === playerId);

  const { data: gamesData, isLoading: isLoadingGames } = useGetGames({
    playerName: player?.name,
    pageSize: 1000,
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
      const isPlayer1 =
        game.player_1_name === player.name ||
        game.player_1b_name === player.name;
      const isPlayer2 =
        game.player_2_name === player.name ||
        game.player_2b_name === player.name;

      const p1Score = parseInt(game.player_1_score, 10) || 0;
      const p2Score = parseInt(game.player_2_score, 10) || 0;

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
        date: new Date(game.created_at).toLocaleString(),
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
  }, [player, gamesData]);

  if (isLoadingPlayers || isLoadingGames) {
    return (
      <>
        <PageHeader title="Jugador" back="/players" />
        <div className="mx-auto max-w-5xl px-3 py-4">
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
        <PageHeader title="Jugador" back="/players" />
        <div className="mx-auto max-w-5xl px-3 py-4">
          <Card>
            <EmptyState
              title="Jugador no encontrado"
              hint="Puede que se haya eliminado o que el enlace sea antiguo."
              action={
                <Link
                  to="/players"
                  className={buttonClasses({ variant: "secondary" })}
                >
                  Ver todos los jugadores
                </Link>
              }
            />
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={player.name}
        subtitle={CATEGORY_LABEL[player.category]}
        back="/players"
      />

      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        {user && <PlayerTabs playerId={player.id} />}

        {stats && stats.totalGames > 0 ? (
          <>
            <Card className="grid grid-cols-2 gap-5 p-5">
              <Stat
                label="Partidos ganados"
                value={`${stats.winRate}%`}
                delta={`${stats.gamesWon} de ${stats.totalGames}`}
                tone="good"
              />
              <Stat
                label="Mesas ganadas"
                value={`${stats.rackWinRate}%`}
                delta={`${stats.racksWon} de ${stats.racksWon + stats.racksLost}`}
              />
            </Card>

            <Card className="overflow-hidden">
              <CardHeader title="Victorias a lo largo del tiempo" />
              <div className="h-64 w-full p-3 text-caption md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                    <XAxis
                      dataKey="date"
                      stroke={AXIS}
                      tick={{ fill: AXIS, fontSize: 12 }}
                      axisLine={{ stroke: GRID }}
                      tickLine={{ stroke: GRID }}
                      tickFormatter={(val) => val.split(",")[0]}
                    />
                    <YAxis
                      stroke={AXIS}
                      tick={{ fill: AXIS, fontSize: 12 }}
                      domain={[0, 100]}
                      axisLine={{ stroke: GRID }}
                      tickLine={{ stroke: GRID }}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2624",
                        border: "1px solid rgba(255,255,255,0.13)",
                        borderRadius: "10px",
                        color: "#f4f2ec",
                        fontSize: 14,
                      }}
                      itemStyle={{ color: "#f4f2ec" }}
                      formatter={(value) => `${value}%`}
                      itemSorter={(i) => (i.dataKey === "gameWinRate" ? -1 : 1)}
                    />
                    <Line
                      type="step"
                      name="Mesas"
                      dataKey="rackWinRate"
                      stroke={LINE_RACKS}
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      dot={false}
                    />
                    <Line
                      type="step"
                      name="Partidos"
                      dataKey="gameWinRate"
                      stroke={LINE_GAMES}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader title="Historial de partidos" />
              <div className="p-3">
                <GamesList
                  games={gamesData?.games ?? []}
                  playerName={player.name}
                  showDates
                />
              </div>
            </Card>
          </>
        ) : (
          <Card>
            <EmptyState
              title="Sin partidos todavía"
              hint={`${player.name} aparecerá en la clasificación en cuanto juegue el primero.`}
              action={
                <Link to="/games/new" className={buttonClasses({})}>
                  Añadir partido
                </Link>
              }
            />
          </Card>
        )}
      </div>
    </>
  );
}
