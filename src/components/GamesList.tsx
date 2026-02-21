import type { Game } from "@/types";
import React from "react";

interface GamesListProps {
  games: Game[];
  playerName?: string;
  showDates?: boolean;
}

export default function GamesList({
  games,
  playerName,
  showDates,
}: GamesListProps) {
  if (!games || games.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        No hay partidos registrados.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {games.map((game, index) => {
        const {
          id,
          player_1_name,
          player_1_score,
          player_2_score,
          player_2_name,
          player_1b_name,
          player_2b_name,
          mode,
          created_at,
        } = game;
        const isDoubles = mode === "doubles";
        const team1 = isDoubles
          ? `${player_1_name} / ${player_1b_name}`
          : player_1_name;
        const team2 = isDoubles
          ? `${player_2_name} / ${player_2b_name}`
          : player_2_name;

        const p1Score = parseInt(player_1_score, 10) || 0;
        const p2Score = parseInt(player_2_score, 10) || 0;
        const p1Won = p1Score > p2Score;
        const p2Won = p2Score > p1Score;

        let bgClass = "bg-dark-bg hover:bg-dark-card-hover border-dark-border";
        if (playerName) {
          const inTeam1 =
            player_1_name === playerName || player_1b_name === playerName;
          const inTeam2 =
            player_2_name === playerName || player_2b_name === playerName;

          if (inTeam1) {
            bgClass = p1Won
              ? "bg-green-900/20 hover:bg-green-900/30 border-green-900/50"
              : "bg-red-900/20 hover:bg-red-900/30 border-red-900/50";
          } else if (inTeam2) {
            bgClass = p2Won
              ? "bg-green-900/20 hover:bg-green-900/30 border-green-900/50"
              : "bg-red-900/20 hover:bg-red-900/30 border-red-900/50";
          }
        }

        const currentLocalDate = new Date(created_at).toLocaleDateString();

        const previousLocalDate =
          index > 0
            ? new Date(games[index - 1].created_at).toLocaleDateString()
            : "";

        const newDate = currentLocalDate !== previousLocalDate;

        return (
          <React.Fragment key={id}>
            {showDates && newDate && (
              <h3 className="text-gray-400 font-semibold text-xs mt-6 mb-2 px-3 tracking-wider uppercase">
                {currentLocalDate}
              </h3>
            )}
            <div
              className={`flex justify-between items-center p-4 rounded-2xl border transition-colors group ${bgClass}`}
            >
              <div className="w-full flex items-center gap-1 text-gray-300">
                <span
                  className={`flex-1 text-right ${
                    player_1_score > player_2_score
                      ? "font-bold text-white"
                      : ""
                  }`}
                >
                  {team1}
                </span>
                <span>{player_1_score}</span>-<span>{player_2_score}</span>
                <span
                  className={`flex-1 ${
                    player_2_score > player_1_score
                      ? "font-bold text-white"
                      : ""
                  }`}
                >
                  {team2}
                </span>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
