import type { DailyRankingEntry, Category } from "@/types";

type ViewMode = "combined" | "byCategory";

const CATEGORY_NAMES: Record<Category, string> = {
    1: "Primera",
    2: "Segunda",
    3: "Tercera",
};

const RANKING_COLORS: Record<number, string> = {
    1: "rgb(223, 180, 36)",
    2: "rgb(157, 162, 165)",
    3: "rgb(204, 112, 21)",
};

interface RankingTableProps {
    ranking: DailyRankingEntry[] | null;
    rankingByCategory: Record<Category, DailyRankingEntry[]> | null;
    viewMode: ViewMode;
    isLoading: boolean;
    emptyMessage?: string;
}

export default function RankingTable({
    ranking,
    rankingByCategory,
    viewMode,
    isLoading,
    emptyMessage = "No hay partidos registrados para este criterio.",
}: RankingTableProps) {
    if (isLoading) {
        return (
            <div className="py-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
            </div>
        );
    }

    if (viewMode === "combined") {
        if (!ranking || ranking.length === 0) {
            return <p className="py-6 text-center text-gray-500">{emptyMessage}</p>;
        }

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-gray-700">
                    <thead>
                        <tr className="border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wide">
                            <th className="py-3 pr-2 px-3">#</th>
                            <th className="py-3 pr-2">Jugador</th>
                            <th className="py-3 pr-2 text-right">Victorias</th>
                            <th className="py-3 pr-2 text-right">Partidas</th>
                            <th className="py-3 pr-2 text-right">Puntos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ranking.map((entry, index) => (
                            <tr
                                key={entry.playerId}
                                className="border-b border-gray-100 hover:bg-gray-50"
                            >
                                <td className="py-3 pr-2 font-medium">
                                    <span
                                        className="rounded-full px-3 py-2"
                                        style={{
                                            backgroundColor: RANKING_COLORS[index + 1],
                                            color: index <= 2 ? "white" : undefined,
                                        }}
                                    >
                                        {index + 1}
                                    </span>
                                </td>
                                <td
                                    className="py-3 pr-2"
                                    style={{
                                        fontWeight: index <= 2 ? "bold" : undefined,
                                    }}
                                >
                                    {entry.playerName} ({entry.category}ª)
                                </td>
                                <td className="py-3 pr-2 text-right">{entry.gamesWon}</td>
                                <td className="py-3 pr-2 text-right">{entry.gamesPlayed}</td>
                                <td className="py-3 pr-2 text-right font-semibold">
                                    {entry.points}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    // viewMode === "byCategory"
    if (!rankingByCategory) {
        return <p className="py-6 text-center text-gray-500">{emptyMessage}</p>;
    }

    const hasAny =
        rankingByCategory[1].length > 0 ||
        rankingByCategory[2].length > 0 ||
        rankingByCategory[3].length > 0;

    if (!hasAny) {
        return <p className="py-6 text-center text-gray-500">{emptyMessage}</p>;
    }

    return (
        <div className="space-y-8">
            {([1, 2, 3] as const).map((cat) => {
                const entries = rankingByCategory[cat];
                if (entries.length === 0) return null;
                return (
                    <div key={cat}>
                        <h3 className="mb-3 text-base font-semibold text-gray-700 flex items-center gap-2">
                            {CATEGORY_NAMES[cat]}
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-gray-700">
                                <thead>
                                    <tr className="border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wide">
                                        <th className="py-3 pr-2 px-3">#</th>
                                        <th className="py-3 pr-2">Jugador</th>
                                        <th className="py-3 pr-2 text-right">Victorias</th>
                                        <th className="py-3 pr-2 text-right">Partidas</th>
                                        <th className="py-3 pr-2 text-right">Puntos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map((entry, index) => (
                                        <tr
                                            key={entry.playerId}
                                            className="border-b border-gray-100 hover:bg-gray-50"
                                        >
                                            <td className="py-3 pr-2 font-medium">
                                                <span
                                                    className="rounded-full px-3 py-2"
                                                    style={{
                                                        backgroundColor: RANKING_COLORS[index + 1],
                                                        color: index <= 2 ? "white" : undefined,
                                                    }}
                                                >
                                                    {index + 1}
                                                </span>
                                            </td>
                                            <td
                                                className="py-3 pr-2"
                                                style={{
                                                    fontWeight: index <= 2 ? "bold" : undefined,
                                                }}
                                            >
                                                {entry.playerName}
                                            </td>
                                            <td className="py-3 pr-2 text-right">{entry.gamesWon}</td>
                                            <td className="py-3 pr-2 text-right">
                                                {entry.gamesPlayed}
                                            </td>
                                            <td className="py-3 pr-2 text-right font-semibold">
                                                {entry.points}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
