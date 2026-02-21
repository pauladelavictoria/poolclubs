import type { DailyRankingEntry } from "@/types";
import { Link } from "react-router-dom";

type ViewMode = "combined" | "byCategory";

const RANKING_COLORS: Record<number, string> = {
  1: "rgb(223, 180, 36)",
  2: "rgb(157, 162, 165)",
  3: "rgb(204, 112, 21)",
};

interface RankingTableProps {
  entries: DailyRankingEntry[];
  gamesLabel: string;
  viewMode: ViewMode;
}

export default function RankingTable({
  entries,
  gamesLabel,
  viewMode,
}: RankingTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-gray-300">
        <thead>
          <tr className="border-b border-dark-border text-sm text-gray-500 uppercase tracking-wide">
            <th className="py-2 pr-2 ps-5">#</th>
            <th className="py-2 pr-2">Jugador</th>
            <th className="py-2 pr-2 text-right">{gamesLabel}</th>
            <th className="py-2 pr-4 text-right">Puntos</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr
              key={entry.playerId}
              className="border-b border-dark-border hover:bg-dark-card-hover"
            >
              <td className="py-2 pr-2 font-medium">
                <span
                  className="rounded-xl px-3 py-2 ms-2"
                  style={{
                    backgroundColor: RANKING_COLORS[index + 1],
                    color: index <= 2 ? "white" : undefined,
                  }}
                >
                  {index + 1}
                </span>
              </td>
              <td
                className="py-2 pr-2"
                style={{
                  fontWeight: index <= 2 ? "bold" : undefined,
                }}
              >
                <Link
                  to={`/players/${entry.playerId}`}
                  className="text-white hover:text-blue-400 transition-colors"
                >
                  {entry.playerName}{" "}
                  {viewMode === "combined" && `(${entry.category}ª)`}
                </Link>
              </td>
              <td className="py-2 pr-2 text-right flex gap-1 items-center justify-end h-12">
                {entry.last10Games
                  ? entry.last10Games.map((gameWon, idx) => {
                      if (idx < entry.gamesPlayed)
                        return (
                          <div
                            key={idx}
                            className={`w-1 h-1 rounded-xl ${gameWon ? "bg-green-500" : "bg-red-500"}`}
                          />
                        );
                    })
                  : new Array(entry.gamesPlayed)
                      .fill(0)
                      .map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 h-1 rounded-xl ${entry.gamesWon > i ? "bg-green-500" : "bg-red-500"}`}
                        />
                      ))}
              </td>
              <td className="py-2 pr-4 text-right font-semibold me-4">
                {entry.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
