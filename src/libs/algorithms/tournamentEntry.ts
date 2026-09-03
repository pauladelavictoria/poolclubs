import type { Category } from "@/types";

/**
 * Whether a player may enter a tournament. UI mirror of the `tournament_players`
 * RLS policies in sql/schema.sql — change both together.
 *
 * A tournament with no category is the combined one and takes anybody; a
 * tournament with one is that division's and takes nobody else. A player whose
 * category isn't known yet (no player row, i.e. not a member) enters nothing.
 */
export function canEnterTournament(
  tournamentCategory: Category | null,
  playerCategory: Category | null | undefined,
): boolean {
  if (playerCategory == null) return false;
  return tournamentCategory === null || tournamentCategory === playerCategory;
}
