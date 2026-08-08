import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LuTrash2 } from "react-icons/lu";
import PageHeader from "@/components/PageHeader";
import DrillProgressChart from "@/components/DrillProgressChart";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useGetDrillLogs } from "@/hooks/useGetDrillLogs";
import { useGetDrills } from "@/hooks/useGetDrills";
import { useDeleteDrillLog } from "@/hooks/useDeleteDrillLog";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Stat } from "@/components/ui/Stat";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { DIFFICULTY_LABELS, type DrillDifficulty } from "@/types";
import { scoreBand, scorePct } from "@/libs/scoreBand";

export default function TrainingProgressPage() {
  // The URL is the single source of truth for which player is shown
  const { playerId } = useParams<{ playerId: string }>();
  const selectedPlayerId = playerId ? Number(playerId) : null;

  // Filters are a view over data already in memory, so they stay local state
  const [difficulty, setDifficulty] = useState<DrillDifficulty | "">("");
  const [drillId, setDrillId] = useState<number | "">("");

  const { user } = useAuth();
  const { data: players } = useGetPlayers();
  const { data: drills } = useGetDrills();
  const deleteLog = useDeleteDrillLog();
  const { data: allLogs, isLoading } = useGetDrillLogs({
    player_id: selectedPlayerId ?? undefined,
  });

  const drillsById = useMemo(
    () => new Map(drills?.map((d) => [d.id, d]) ?? []),
    [drills],
  );

  // Only offer drills this player has actually logged, narrowed by difficulty
  const drillOptions = useMemo(() => {
    const loggedIds = new Set(allLogs?.map((l) => l.drill_id) ?? []);
    return (drills ?? [])
      .filter((d) => loggedIds.has(d.id))
      .filter((d) => !difficulty || d.difficulty === difficulty);
  }, [drills, allLogs, difficulty]);

  const logs = useMemo(() => {
    if (!allLogs) return allLogs;
    return allLogs.filter((l) => {
      if (drillId !== "" && l.drill_id !== drillId) return false;
      if (difficulty && drillsById.get(l.drill_id)?.difficulty !== difficulty)
        return false;
      return true;
    });
  }, [allLogs, drillId, difficulty, drillsById]);

  const stats = useMemo(() => {
    if (!logs || logs.length === 0) return null;

    const totalAttempts = logs.length;
    const avgScore =
      logs.reduce(
        (sum, l) => sum + (l.max_score > 0 ? l.score / l.max_score : 0),
        0,
      ) / totalAttempts;

    const drillIds = new Set(logs.map((l) => l.drill_id));
    const bestLog = logs.reduce((best, l) => {
      const pct = l.max_score > 0 ? l.score / l.max_score : 0;
      const bestPct = best.max_score > 0 ? best.score / best.max_score : 0;
      return pct > bestPct ? l : best;
    }, logs[0]);

    // Trend: the last five attempts against everything before them
    const pct = (l: (typeof logs)[number]) =>
      l.max_score > 0 ? l.score / l.max_score : 0;
    const recent = logs.slice(0, 5);
    const earlier = logs.slice(5);
    const mean = (ls: typeof logs) =>
      ls.reduce((sum, l) => sum + pct(l), 0) / ls.length;
    const trend = earlier.length
      ? Math.round((mean(recent) - mean(earlier)) * 100)
      : null;

    return {
      totalAttempts,
      avgScore: Math.round(avgScore * 100),
      uniqueDrills: drillIds.size,
      bestScore:
        bestLog.max_score > 0
          ? Math.round((bestLog.score / bestLog.max_score) * 100)
          : 0,
      trend,
    };
  }, [logs]);

  const player = players?.find((p) => p.id === selectedPlayerId);

  // Deleting a result is not undoable and it moves the averages, so it asks
  function handleDelete(id: number) {
    if (!window.confirm("¿Borrar este resultado? No se puede deshacer."))
      return;
    deleteLog.mutate(id, {
      onError: (e) => window.alert(e.message),
    });
  }

  return (
    <>
      <PageHeader
        title="Progreso"
        subtitle={player?.name}
        back={`/players/${selectedPlayerId}`}
      />

      <div className="mx-auto max-w-3xl space-y-4 px-3 py-4">
        {allLogs && allLogs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Select
              size="sm"
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value as DrillDifficulty | "");
                // The chosen drill may not exist in the new difficulty
                setDrillId("");
              }}
              aria-label="Filtrar por dificultad"
            >
              <option value="">Toda dificultad</option>
              {(
                Object.entries(DIFFICULTY_LABELS) as [DrillDifficulty, string][]
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>

            <Select
              size="sm"
              value={drillId}
              onChange={(e) =>
                setDrillId(e.target.value ? Number(e.target.value) : "")
              }
              aria-label="Filtrar por ejercicio"
            >
              <option value="">Todos los ejercicios</option>
              {drillOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {isLoading ? (
          <Card className="p-3">
            <SkeletonRows rows={5} />
          </Card>
        ) : !stats ? (
          <Card>
            {allLogs && allLogs.length > 0 ? (
              <EmptyState
                title="Ningún resultado con estos filtros"
                hint="Prueba con otra dificultad u otro ejercicio."
                action={
                  <button
                    type="button"
                    onClick={() => {
                      setDifficulty("");
                      setDrillId("");
                    }}
                    className={buttonClasses({ variant: "secondary" })}
                  >
                    Quitar filtros
                  </button>
                }
              />
            ) : (
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
            )}
          </Card>
        ) : (
          <>
            <Card className="grid grid-cols-2 gap-5 p-5 sm:grid-cols-4">
              <Stat label="Intentos" value={stats.totalAttempts} />
              <Stat
                label="Media"
                value={`${stats.avgScore}%`}
                tone="good"
                delta={
                  stats.trend === null
                    ? undefined
                    : `${stats.trend > 0 ? "+" : ""}${stats.trend} pts`
                }
              />
              <Stat label="Ejercicios" value={stats.uniqueDrills} />
              <Stat label="Mejor" value={`${stats.bestScore}%`} />
            </Card>

            {logs && logs.length > 1 && <DrillProgressChart logs={logs} />}

            {logs && logs.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader
                  title="Últimos resultados"
                  action={
                    <span className="text-caption tabular-nums text-ink-faint">
                      {Math.min(logs.length, 30)} de {logs.length}
                    </span>
                  }
                />
                <ul className="p-2">
                  {logs.slice(0, 30).map((log, idx, shown) => {
                    const pct = scorePct(log.score, log.max_score);
                    const band = scoreBand(pct);
                    const date = new Date(log.created_at);
                    const day = date.toLocaleDateString(undefined, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    });
                    // Only the first log of each day carries the date header
                    const prev = idx > 0 ? shown[idx - 1] : null;
                    const newDay =
                      !prev ||
                      new Date(prev.created_at).toDateString() !==
                        date.toDateString();
                    const drill = drillsById.get(log.drill_id);

                    return (
                      <li key={log.id}>
                        {newDay && (
                          <div className="px-2 pb-1 pt-3 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint first:pt-1">
                            {day}
                          </div>
                        )}
                        {/* The delete button is a sibling, not a child: a
                            button inside a link is neither clickable reliably
                            nor valid. It is absolute so the hidden-until-hover
                            state costs no gutter; only touch, where it is
                            always visible, pays for the space. */}
                        <div className="group relative">
                          <Link
                            to={`/drills/${log.drill_id}`}
                            className={`block rounded-control px-2 py-2.5 transition-colors duration-150 hover:bg-felt-raised ${
                              user ? "max-sm:pr-11" : ""
                            }`}
                          >
                            <div className="flex items-baseline gap-3">
                              <span className="flex-1 truncate text-body text-ink">
                                {drill?.name ?? `Ejercicio #${log.drill_id}`}
                              </span>
                              <span className="font-mono text-caption tabular-nums text-ink-faint">
                                {log.score}/{log.max_score}
                              </span>
                              <span
                                className="w-12 text-right font-mono text-body font-semibold tabular-nums"
                                style={{ color: band.color }}
                                title={band.label}
                              >
                                {pct}%
                              </span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-3">
                              <div
                                className="h-1 flex-1 overflow-hidden rounded-full bg-felt-raised"
                                role="presentation"
                              >
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: band.color,
                                  }}
                                />
                              </div>
                              <time
                                dateTime={log.created_at}
                                className="text-caption tabular-nums text-ink-faint"
                              >
                                {date.toLocaleTimeString(undefined, {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </time>
                            </div>
                            {log.notes && (
                              <p className="mt-1 line-clamp-2 text-caption text-ink-soft">
                                {log.notes}
                              </p>
                            )}
                          </Link>

                          {user && (
                            <button
                              type="button"
                              onClick={() => handleDelete(log.id)}
                              disabled={deleteLog.isPending}
                              title="Borrar resultado"
                              aria-label={`Borrar el resultado de ${
                                drill?.name ?? "este ejercicio"
                              } del ${day}`}
                              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-control bg-felt p-2 text-ink-faint opacity-0 transition-colors duration-150 hover:bg-felt-raised hover:text-strike focus-visible:opacity-100 disabled:cursor-not-allowed group-hover:opacity-100 max-sm:opacity-100"
                            >
                              <LuTrash2 aria-hidden />
                            </button>
                          )}
                        </div>
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
