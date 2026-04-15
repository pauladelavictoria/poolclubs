import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import Layout from "./Layout";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useGetDrillLogs } from "@/hooks/useGetDrillLogs";
import DrillProgressChart from "@/components/DrillProgressChart";
import { Select } from "@/components/ui/Select";
import { HiChevronLeft } from "react-icons/hi";

export default function TrainingProgressPage() {
  const { playerId: paramPlayerId } = useParams<{ playerId: string }>();
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(
    paramPlayerId ? Number(paramPlayerId) : null
  );

  const { data: players } = useGetPlayers();
  const { data: logs, isLoading } = useGetDrillLogs({
    player_id: selectedPlayerId ?? undefined,
  });

  const stats = useMemo(() => {
    if (!logs || logs.length === 0) return null;

    const totalAttempts = logs.length;
    const avgScore =
      logs.reduce(
        (sum, l) => sum + (l.max_score > 0 ? l.score / l.max_score : 0),
        0
      ) / totalAttempts;

    // Count by skill type (we'd need drill data for this, but we can use drill_id grouping)
    const drillIds = new Set(logs.map((l) => l.drill_id));
    const bestLog = logs.reduce(
      (best, l) => {
        const pct = l.max_score > 0 ? l.score / l.max_score : 0;
        const bestPct = best.max_score > 0 ? best.score / best.max_score : 0;
        return pct > bestPct ? l : best;
      },
      logs[0]
    );

    return {
      totalAttempts,
      avgScore: Math.round(avgScore * 100),
      uniqueDrills: drillIds.size,
      bestScore: bestLog.max_score > 0
        ? Math.round((bestLog.score / bestLog.max_score) * 100)
        : 0,
    };
  }, [logs]);

  const player = players?.find((p) => p.id === selectedPlayerId);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link
            to="/entrenamientos"
            className="text-gray-400 hover:text-white transition-colors p-2 bg-dark-card rounded-xl"
          >
            <HiChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold text-white">
            Progreso de entrenamiento
          </h1>
        </div>

        {/* Player selector */}
        <div className="mb-6">
          <Select
            className="p-3 rounded-2xl"
            value={selectedPlayerId ?? ""}
            onChange={(e) =>
              setSelectedPlayerId(
                e.target.value ? Number(e.target.value) : null
              )
            }
          >
            <option value="">Seleccionar jugador</option>
            {players?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        {!selectedPlayerId && (
          <div className="bg-dark-card p-8 rounded-3xl border border-dark-border shadow-card text-center">
            <p className="text-gray-400">
              Selecciona un jugador para ver su progreso.
            </p>
          </div>
        )}

        {selectedPlayerId && isLoading && (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-xl h-8 w-8 border-t-2 border-b-2 border-accent-red"></div>
          </div>
        )}

        {selectedPlayerId && !isLoading && stats && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-dark-card p-4 rounded-2xl border border-dark-border shadow-card text-center">
                <div className="text-sm text-gray-400 mb-1">Intentos</div>
                <div className="text-2xl font-bold text-white">
                  {stats.totalAttempts}
                </div>
              </div>
              <div className="bg-dark-card p-4 rounded-2xl border border-dark-border shadow-card text-center">
                <div className="text-sm text-gray-400 mb-1">Puntuación media</div>
                <div className="text-2xl font-bold text-green-400">
                  {stats.avgScore}%
                </div>
              </div>
              <div className="bg-dark-card p-4 rounded-2xl border border-dark-border shadow-card text-center">
                <div className="text-sm text-gray-400 mb-1">
                  Ejercicios distintos
                </div>
                <div className="text-2xl font-bold text-blue-400">
                  {stats.uniqueDrills}
                </div>
              </div>
              <div className="bg-dark-card p-4 rounded-2xl border border-dark-border shadow-card text-center">
                <div className="text-sm text-gray-400 mb-1">Mejor resultado</div>
                <div className="text-2xl font-bold text-yellow-400">
                  {stats.bestScore}%
                </div>
              </div>
            </div>

            {/* Progress chart */}
            {logs && logs.length > 1 && (
              <div className="mb-6">
                <DrillProgressChart
                  logs={logs}
                  title={`Progreso de ${player?.name ?? "jugador"}`}
                />
              </div>
            )}

            {/* Recent logs */}
            {logs && logs.length > 0 && (
              <div className="bg-dark-card p-4 md:p-6 rounded-3xl border border-dark-border shadow-card">
                <h2 className="text-xl font-bold text-white mb-4">
                  Últimos resultados
                </h2>
                <div className="space-y-2">
                  {logs.slice(0, 30).map((log) => (
                    <Link
                      key={log.id}
                      to={`/entrenamientos/${log.drill_id}`}
                      className="flex justify-between items-center p-3 bg-dark-bg hover:bg-dark-card-hover rounded-2xl border border-dark-border transition-colors"
                    >
                      <div className="text-sm text-gray-400">
                        {new Date(log.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-white font-medium">
                        {log.score}/{log.max_score}
                        <span className="text-gray-400 text-sm ml-2">
                          (
                          {log.max_score > 0
                            ? Math.round((log.score / log.max_score) * 100)
                            : 0}
                          %)
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {selectedPlayerId && !isLoading && !stats && (
          <div className="bg-dark-card p-8 rounded-3xl border border-dark-border shadow-card text-center">
            <p className="text-gray-400">
              Este jugador aún no tiene resultados de entrenamiento.
            </p>
            <Link
              to="/entrenamientos"
              className="inline-block mt-4 text-accent-red hover:text-white transition-colors text-sm"
            >
              Ver ejercicios disponibles
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
