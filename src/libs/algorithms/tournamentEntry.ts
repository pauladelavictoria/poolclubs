import type { Category } from "@/types";

/**
 * Whether a player may enter a tournament. UI mirror of the `tournament_players`
 * RLS policies in sql/schema.sql — change both together.
 *
 * A tournament with no categories is the combined one and takes anybody; one
 * with some — one division, or 1st and 2nd together — takes those and nobody
 * else. A player whose category isn't known yet (no player row, i.e. not a
 * member) enters nothing.
 */
export function canEnterTournament(
  categories: Category[] | null,
  playerCategory: Category | null | undefined,
): boolean {
  if (playerCategory == null) return false;
  return categories === null || categories.includes(playerCategory);
}
