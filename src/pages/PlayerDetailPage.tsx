import { useParams, Link } from "react-router-dom";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useGetGames } from "@/hooks/useGetGames";
import Layout from "./Layout";
import GamesList from "@/components/GamesList";
import { HiChevronLeft } from "react-icons/hi";
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

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const playerId = Number(id);

  const { data: players, isLoading: isLoadingPlayers } = useGetPlayers();
  const player = players?.find((p) => p.id === playerId);

  const { data: gamesData, isLoading: isLoadingGames } = useGetGames({
    playerName: player?.name,
    pageSize: 1000, // Fetch up to 1000 recent games for this player
  });

  const stats = useMemo(() => {
    if (!player || !gamesData?.games) return null;

    const games = [...gamesData.games].reverse(); // Reverse to chronological order (oldest first)

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

      const dateStr = new Date(game.created_at).toLocaleString();

      const gameWinRate = (gamesWon / totalGames) * 100;
      const rackWinRate =
        racksWon + racksLost > 0
          ? (racksWon / (racksWon + racksLost)) * 100
          : 0;

      return {
        gameIndex: index + 1,
        date: dateStr,
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
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-xl h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
        </div>
      </Layout>
    );
  }

  if (!player) {
    return (
      <Layout>
        <div className="p-8 text-center text-white">Jugador no encontrado</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/players"
            className="text-gray-400 hover:text-white transition-colors p-2 bg-dark-card rounded-xl"
          >
            <HiChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-3xl font-bold text-white">{player.name}</h1>
          <span
            className={`px-3 py-1 rounded-xl text-sm font-medium ${
              player.category === 1
                ? "bg-yellow-900/50 text-yellow-300 border border-yellow-700/50"
                : player.category === 2
                  ? "bg-gray-700/50 text-gray-300 border border-gray-600/50"
                  : "bg-orange-900/50 text-orange-300 border border-orange-700/50"
            }`}
          >
            Cat {player.category}
          </span>
        </div>

        {stats && stats.totalGames > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-dark-card p-4 rounded-2xl border border-dark-border shadow-card text-center">
                <div className="text-sm text-gray-400 mb-1">
                  Partidos ganados / jugados
                </div>
                <div className="text-2xl font-bold text-white">
                  <div className="text-2xl font-bold text-gray-400">
                    <span className="text-2xl font-bold text-green-400">
                      {stats.gamesWon}
                    </span>
                    {" / "}
                    {stats.gamesWon + stats.gamesLost}{" "}
                    <span className="text-sm">({stats.winRate}%)</span>
                  </div>
                </div>
              </div>
              <div className="bg-dark-card p-4 rounded-2xl border border-dark-border shadow-card text-center">
                <div className="text-sm text-gray-400 mb-1">
                  Mesas ganadas / jugadas
                </div>
                <div className="text-2xl font-bold text-gray-400">
                  <span className="text-blue-400">{stats.racksWon}</span>{" "}
                  <span className="text-gray-400">/</span>{" "}
                  {stats.racksWon + stats.racksLost}{" "}
                  <span className="text-sm">({stats.rackWinRate}%)</span>
                </div>
              </div>
            </div>

            <div className="bg-dark-card p-4 md:p-6 rounded-3xl border border-dark-border shadow-card mb-8">
              <h2 className="text-xl font-bold text-white mb-6 ml-2">
                % Victorias a lo largo del tiempo
              </h2>
              <div className="h-64 md:h-80 w-full text-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="date"
                      stroke="#888"
                      tick={{ fill: "#888" }}
                      axisLine={{ stroke: "#333" }}
                      tickLine={{ stroke: "#333" }}
                      tickFormatter={(val) => val.split(",")[0]}
                    />
                    <YAxis
                      stroke="#888"
                      tick={{ fill: "#888" }}
                      domain={[0, 100]}
                      axisLine={{ stroke: "#333" }}
                      tickLine={{ stroke: "#333" }}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a1a",
                        borderColor: "#333",
                        borderRadius: "0.5rem",
                        color: "#fff",
                      }}
                      itemStyle={{ color: "#fff" }}
                      formatter={(value) => `${value}%`}
                      itemSorter={(i) => (i.dataKey === "gameWinRate" ? -1 : 1)}
                    />
                    <Line
                      type="step"
                      name="Mesas"
                      dataKey="rackWinRate"
                      stroke="#60a5fa"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      dot={false}
                    />
                    <Line
                      type="step"
                      name="Partidos"
                      dataKey="gameWinRate"
                      stroke="#4ade80"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-dark-card p-4 md:p-6 rounded-3xl border border-dark-border shadow-card mb-8">
              <h2 className="text-xl font-bold text-white mb-6 ml-2">
                Historial de Partidos
              </h2>
              <GamesList
                games={gamesData?.games ?? []}
                playerName={player.name}
                showDates
              />
            </div>
          </>
        ) : (
          <div className="bg-dark-card p-8 rounded-3xl border border-dark-border shadow-card text-center">
            <p className="text-gray-400">
              Este jugador aún no tiene partidos registrados.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
