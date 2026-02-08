import { useMemo } from "react";
import type { Game, Player, DailyRankingEntry, Category } from "@/types";

const POINTS_PLAYED = 1;
const POINTS_WIN = 1;
const POINTS_MARGIN_BONUS = 0.5;

function getExpectedWinMarginByCategoryDelta(winnerCategory: Category, loserCategory: Category): number {
  return loserCategory - winnerCategory
}

export const useDailyRanking = ({
  games,
  players,
}: {
  games?: Game[];
  players?: Player[];
}): DailyRankingEntry[] | null => {
  return useMemo(() => {
    if (!players || !games || games.length === 0) return null;

    const playerById = new Map<number, DailyRankingEntry>();

    for (const player of players) {
      playerById.set(player.id, {
        playerId: player.id,
        playerName: player.name,
        category: player.category,
        points: 0,
        gamesPlayed: 0,
        gamesWon: 0,
      });
    }

    for (const game of games) {
      const { player_1_score, player_2_score, player_1_id, player_2_id } = game;
      const p1 = playerById.get(player_1_id);
      const p2 = playerById.get(player_2_id);
      if (!p1 || !p2) continue;

      const s1 = Number(player_1_score);
      const s2 = Number(player_2_score);
      if (Number.isNaN(s1) || Number.isNaN(s2)) continue;

      const winner = s1 > s2 ? p1 : p2;
      const loser = s1 < s2 ? p1 : p2;

      const winnerEntry = playerById.get(winner.playerId);
      const loserEntry = playerById.get(loser.playerId);
      if (!winnerEntry || !loserEntry) {
        continue;
      }
      winnerEntry.gamesPlayed += 1;
      winnerEntry.gamesWon += 1;
      winnerEntry.points += POINTS_PLAYED + POINTS_WIN;
      loserEntry.gamesPlayed += 1;
      loserEntry.points += POINTS_PLAYED;
      const expectedWinMargin = getExpectedWinMarginByCategoryDelta(winner.category, loser.category);
      const winMargin = Math.abs(s1 - s2);
      if(winMargin > expectedWinMargin) {
        winnerEntry.points += (winMargin - expectedWinMargin) * POINTS_MARGIN_BONUS;
      }
    }

    const entries: DailyRankingEntry[] = Array.from(playerById.entries())
      .map(([, entry]) => entry)
      .filter((p) => p.gamesPlayed !== 0)
      .sort((a, b) => b.category - a.category)
      .sort((a, b) => b.points - a.points)
      .sort((a, b) => b.gamesWon - a.gamesWon);

    return entries.length > 0 ? entries : null;
  }, [games, players]);
};
