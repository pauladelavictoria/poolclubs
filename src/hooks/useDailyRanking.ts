import { useMemo } from "react";
import { tallyDaily } from "@/libs/algorithms/dailyScore";
import type { Game, Player, DailyRankingEntry } from "@/types";

export const useDailyRanking = ({
  games,
  players,
}: {
  games?: Game[];
  players?: Player[];
}): DailyRankingEntry[] | null =>
  useMemo(() => {
    if (!players || !games || games.length === 0) return null;
    const entries = tallyDaily(games, players);
    return entries.length > 0 ? entries : null;
  }, [games, players]);
