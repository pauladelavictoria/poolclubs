import { GLOBAL_CLUB_SLUG } from "./features";

/** Just the seats — a game, or anything shaped like one. */
type Seats = {
  player_1_id: number;
  player_2_id: number;
  player_1b_id?: number | null;
  player_2b_id?: number | null;
};

/**
 * Who may correct a result. UI mirror of the `games` UPDATE and DELETE policies
 * in sql/schema.sql — change both together. This only decides what to show; the
 * database is the gate.
 *
 * A club admin, as always. And in the global lobby, whoever played: the lobby
 * has no admin anybody can reach, so without this a mistyped score in there
 * would be permanent.
 */
export function canEditGame(
  game: Seats,
  playerId: number | null | undefined,
  clubSlug: string | null | undefined,
  isClubAdmin: boolean,
): boolean {
  if (isClubAdmin) return true;
  if (clubSlug !== GLOBAL_CLUB_SLUG || playerId == null) return false;

  return [
    game.player_1_id,
    game.player_2_id,
    game.player_1b_id,
    game.player_2b_id,
  ].includes(playerId);
}
