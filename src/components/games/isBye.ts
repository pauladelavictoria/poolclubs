import type { TournamentMatch } from "@/types";

/** Settled with an empty seat: the opposite side is not undecided, it is
 *  nobody — the seat was a bye and the match is not going to be played. A
 *  forfeit has both names, so it is a fixture and stays. */
export const isBye = (match: TournamentMatch) =>
  match.winner_id !== null && (match.p1_id === null || match.p2_id === null);
