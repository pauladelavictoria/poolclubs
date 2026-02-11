import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { HiHome } from "react-icons/hi";
import { useGetGames } from "@/hooks/useGetGames";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useEloRanking } from "@/hooks/useEloRanking";
import Layout from "./Layout";
import RankingTable from "@/components/RankingTable";
import type { Category } from "@/types";

type ViewMode = "combined" | "byCategory";

export default function RankingAllTimePage() {
    const [viewMode, setViewMode] = useState<ViewMode>("combined");

    // Fetch all games (limit to 10000 for now to get "all-time")
    const { data: gamesData, isLoading: gamesLoading } = useGetGames({
        pageSize: 10000,
    });
    const games = gamesData?.games ?? [];

    const { data: players, isLoading: playersLoading } = useGetPlayers();

    const ranking = useEloRanking({ games, players });

    const rankingByCategory = useMemo(() => {
        if (!ranking) return null;
        const byCat: Record<Category, typeof ranking> = { 1: [], 2: [], 3: [] };
        for (const entry of ranking) {
            byCat[entry.category].push(entry);
        }
        return byCat;
    }, [ranking]);

    return (
        <Layout>
            <div className="mx-auto px-1 py-1">
                <div className="bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4 text-white">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="w-full flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Link
                                        to="/"
                                        className="inline-flex items-center gap-2 text-white py-2 transition-colors"
                                        aria-label="Inicio"
                                    >
                                        <HiHome className="h-6 w-6" aria-hidden />
                                    </Link>
                                    <h1 className="text-2xl font-bold">Ranking Global</h1>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-5">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                            <h2 className="text-lg text-center sm:text-left font-medium text-gray-700">
                                Clasificación General {games.length > 0 && `(${games.length} partidas)`}
                            </h2>
                            <div
                                className="flex rounded-lg border border-gray-300 p-0.5 bg-gray-100"
                                role="tablist"
                                aria-label="Vista del ranking"
                            >
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={viewMode === "combined"}
                                    onClick={() => setViewMode("combined")}
                                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${viewMode === "combined"
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                        }`}
                                >
                                    Combinado
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={viewMode === "byCategory"}
                                    onClick={() => setViewMode("byCategory")}
                                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${viewMode === "byCategory"
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                        }`}
                                >
                                    Por categoría
                                </button>
                            </div>
                        </div>

                        <RankingTable
                            ranking={ranking}
                            rankingByCategory={rankingByCategory}
                            viewMode={viewMode}
                            isLoading={gamesLoading || playersLoading}
                            emptyMessage="No hay partidos registrados aún."
                        />
                    </div>
                </div>
            </div>
        </Layout>
    );
}
