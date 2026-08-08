import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LuPlus, LuTv, LuX } from "react-icons/lu";
import { useGetGames } from "@/hooks/useGetGames";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useDailyRanking } from "@/hooks/useDailyRanking";
import PageHeader from "@/components/PageHeader";
import Ranking from "@/components/Ranking";
import GamesList from "@/components/GamesList";
import { Card, CardHeader } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { SkeletonRows } from "@/components/ui/Skeleton";
import type { Category } from "@/types";

type ViewMode = "combined" | "byCategory";

function getTodayYYYYMMDD() {
  return new Date().toISOString().split("T")[0];
}

function parseDateParam(param: string | null): string {
  if (!param) return getTodayYYYYMMDD();
  const date = new Date(param);
  if (Number.isNaN(date.getTime())) return getTodayYYYYMMDD();
  return param.split("T")[0];
}

export default function RankingDailyPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDate = parseDateParam(searchParams.get("date"));

  const [viewMode, setViewMode] = useState<ViewMode>("combined");
  const tvRef = useRef<HTMLDivElement>(null);
  const [isTv, setIsTv] = useState(false);

  useEffect(() => {
    const sync = () => setIsTv(document.fullscreenElement === tvRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggleTv = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else tvRef.current?.requestFullscreen();
  };

  const { data: gamesData, isLoading: gamesLoading } = useGetGames({
    date: selectedDate,
    mode: "single",
  });
  const games = gamesData?.games ?? [];

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) setSearchParams({ date: e.target.value });
  };

  const { data: players, isLoading: playersLoading } = useGetPlayers();
  const ranking = useDailyRanking({ games, players });

  const rankingByCategory = useMemo(() => {
    if (!ranking) return null;
    const byCat: Record<Category, typeof ranking> = { 1: [], 2: [], 3: [] };
    for (const entry of ranking) byCat[entry.category].push(entry);
    return byCat;
  }, [ranking]);

  return (
    <>
      <PageHeader title="Ranking diario">
        <input
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          aria-label="Seleccionar fecha"
          className="h-8 shrink-0 rounded-control border border-hairline bg-pocket px-2 text-caption tabular-nums text-ink [color-scheme:dark] transition-colors duration-150 hover:border-hairline-strong"
        />
        <button
          type="button"
          onClick={toggleTv}
          title="Modo TV"
          aria-label="Modo TV"
          className={buttonClasses({
            size: "sm",
            variant: "secondary",
            className: "shrink-0",
          })}
        >
          <LuTv className="h-4 w-4" aria-hidden />
        </button>
        <Link
          to="/games/new"
          className={buttonClasses({ size: "sm", className: "shrink-0" })}
        >
          <LuPlus className="h-4 w-4" aria-hidden />
          Añadir partido
        </Link>
      </PageHeader>

      <div
        ref={tvRef}
        style={isTv ? { zoom: 1.6 } : undefined}
        className={`mx-auto grid max-w-5xl gap-4 px-3 py-4 xl:grid-cols-[3fr_2fr] xl:items-start ${
          isTv ? "max-w-none overflow-auto bg-pocket" : ""
        }`}
      >
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-hairline px-3 py-2.5">
            <h2 className="pl-1 text-h4 font-semibold text-ink">
              Clasificación
            </h2>
            <Segmented
              label="Vista del ranking"
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: "combined", label: "Combinado" },
                { value: "byCategory", label: "Por categoría" },
              ]}
            />
          </div>

          <Ranking
            ranking={ranking}
            rankingByCategory={rankingByCategory}
            viewMode={viewMode}
            isLoading={gamesLoading || playersLoading}
            emptyMessage="No hay partidos en esta fecha. La clasificación aparecerá al registrarse el primero."
          />
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Partidos"
            action={
              <span className="font-mono text-body tabular-nums text-ink-faint">
                {games.length}
              </span>
            }
          />
          <div className="p-3">
            {gamesLoading ? (
              <SkeletonRows rows={4} />
            ) : (
              <GamesList games={games} />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
