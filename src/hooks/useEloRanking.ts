import { useMemo } from "react";
import { eloRanking } from "@/libs/algorithms/elo";
import type { Game, Player, DailyRankingEntry } from "@/types";

/** Only three fields are read, so the parameter asks for three: the public club
 *  page ranks a redacted roster that is not a full Player. */
type Ranked = Pick<Player, "id" | "name" | "category">;

// ponytail: recomputed from every game in the club on each render, because
// nothing persists a rating (there is no elo column — see sql/schema.sql). Fine
// for a club's season. Materialise a rating per player if one ever outgrows it.
export const useEloRanking = ({
  games,
  players,
}: {
  games?: Game[];
  players?: Ranked[];
}): DailyRankingEntry[] | null =>
  useMemo(() => {
    if (!players || !games || games.length === 0) return null;
    const entries = eloRanking(games, players);
    return entries.length > 0 ? entries : null;
  }, [games, players]);
