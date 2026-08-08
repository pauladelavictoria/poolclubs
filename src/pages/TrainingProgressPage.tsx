import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import DrillProgressChart from "@/components/DrillProgressChart";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useGetDrillLogs } from "@/hooks/useGetDrillLogs";
import { Card, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Stat } from "@/components/ui/Stat";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/buttonStyles";

export default function TrainingProgressPage() {
  // The URL is the single source of truth for which player is shown
  const { playerId } = useParams<{ playerId: string }>();
  const selectedPlayerId = playerId ? Number(playerId) : null;
  const navigate = useNavigate();

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

    const drillIds = new Set(logs.map((l) => l.drill_id));
    const bestLog = logs.reduce((best, l) => {
      const pct = l.max_score > 0 ? l.score / l.max_score : 0;
      const bestPct = best.max_score > 0 ? best.score / best.max_score : 0;
      return pct > bestPct ? l : best;
    }, logs[0]);

    return {
      totalAttempts,
      avgScore: Math.round(avgScore * 100),
      uniqueDrills: drillIds.size,
      bestScore:
        bestLog.max_score > 0
          ? Math.round((bestLog.score / bestLog.max_score) * 100)
          : 0,
    };
  }, [logs]);

  const player = players?.find((p) => p.id === selectedPlayerId);

  return (
    <>
      <PageHeader
        title="Progreso"
        subtitle={player?.name}
        back={`/players/${selectedPlayerId}`}
      />

      <div className="mx-auto max-w-3xl space-y-4 px-3 py-4">
        {/* Navigating keeps the URL shareable rather than hiding state in the page */}
        <Select
          className="max-w-xs"
          value={selectedPlayerId ?? ""}
          onChange={(e) =>
            navigate(`/players/${e.target.value}/progress`, { replace: true })
          }
          aria-label="Ver el progreso de otro jugador"
        >
          {players?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>

        {isLoading ? (
          <Card className="p-3">
            <SkeletonRows rows={5} />
          </Card>
        ) : !stats ? (
          <Card>
            <EmptyState
              title="Sin resultados todavía"
              hint="Registra el resultado de un ejercicio y el progreso empezará a dibujarse aquí."
              action={
                <Link
                  to="/drills"
                  className={buttonClasses({ variant: "secondary" })}
                >
                  Ver ejercicios
                </Link>
              }
            />
          </Card>
        ) : (
          <>
            <Card className="grid grid-cols-2 gap-5 p-5 sm:grid-cols-4">
              <Stat label="Intentos" value={stats.totalAttempts} />
              <Stat
                label="Media"
                value={`${stats.avgScore}%`}
                tone="good"
              />
              <Stat label="Ejercicios" value={stats.uniqueDrills} />
              <Stat label="Mejor" value={`${stats.bestScore}%`} />
            </Card>

            {logs && logs.length > 1 && (
              <DrillProgressChart
                logs={logs}
                title={`Progreso de ${player?.name ?? "jugador"}`}
              />
            )}

            {logs && logs.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader title="Últimos resultados" />
                <ul className="p-2">
                  {logs.slice(0, 30).map((log) => {
                    const pct =
                      log.max_score > 0
                        ? Math.round((log.score / log.max_score) * 100)
                        : 0;
                    return (
                      <li key={log.id}>
                        <Link
                          to={`/drills/${log.drill_id}`}
                          className="flex items-center gap-3 rounded-control px-2 py-2.5 transition-colors duration-150 hover:bg-felt-raised"
                        >
                          <time className="flex-1 text-caption tabular-nums text-ink-faint">
                            {new Date(log.created_at).toLocaleDateString()}
                          </time>
                          <span className="font-mono text-body tabular-nums text-ink-soft">
                            {log.score}/{log.max_score}
                          </span>
                          <span className="w-12 text-right font-mono text-body font-semibold tabular-nums text-ink">
                            {pct}%
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}
