/** The fields advancement needs. Both PlannedMatch and a stored row satisfy it. */
export type MatchLike = {
  id: string;
  p1_id: number | null;
  p2_id: number | null;
  winner_id: number | null;
  winner_to: string | null;
  winner_to_slot: number | null;
  loser_to: string | null;
  loser_to_slot: number | null;
};

/**
 * Works out who is playing every match, from the results that exist.
 *
 * Two things at once, because they cascade into each other: a played match
 * sends its winner and loser to their next seats, and a match that ends up
 * with a single player is a walkover, settled without anyone playing it. A
 * walkover then advances someone, which can create the next walkover.
 *
 * Non-mutating. The database only ever stores the seats known at generation;
 * this is what the screen renders and what `startTournament` persists.
 */
export function resolveBracket<T extends MatchLike>(matches: T[]): T[] {
  const out = matches.map((m) => ({ ...m }));
  const byId = new Map(out.map((m) => [m.id, m as MatchLike]));

  const key = (id: string, slot: number) => `${id}:${slot}`;

  // Seats that some other match is responsible for filling. Until that match
  // has produced its output, an empty seat means "not yet", not "nobody".
  const fed = new Set<string>();
  for (const m of out) {
    if (m.winner_to && m.winner_to_slot)
      fed.add(key(m.winner_to, m.winner_to_slot));
    if (m.loser_to && m.loser_to_slot)
      fed.add(key(m.loser_to, m.loser_to_slot));
  }

  const delivered = new Set<string>();
  const emitted = new Set<string>();
  const owed = (m: MatchLike, slot: 1 | 2) =>
    fed.has(key(m.id, slot)) && !delivered.has(key(m.id, slot));

  const send = (
    targetId: string | null,
    slot: number | null,
    playerId: number | null,
  ) => {
    if (!targetId || !slot) return;
    delivered.add(key(targetId, slot));
    seat(byId, targetId, slot, playerId);
  };

  let changed = true;
  while (changed) {
    changed = false;
    for (const match of out) {
      if (emitted.has(match.id)) continue;

      const present = [match.p1_id, match.p2_id].filter((id) => id !== null);

      if (match.winner_id === null) {
        // Still waiting on someone, or waiting for a human to play it.
        if (owed(match, 1) || owed(match, 2) || present.length === 2) continue;
        // Nobody left to arrive and at most one player here: a walkover.
        match.winner_id = present[0] ?? null;
      }

      const loser =
        present.length === 2
          ? match.p1_id === match.winner_id
            ? match.p2_id
            : match.p1_id
          : null;

      send(match.winner_to, match.winner_to_slot, match.winner_id);
      send(match.loser_to, match.loser_to_slot, loser);
      emitted.add(match.id);
      changed = true;
    }
  }
  return out;
}

/** Writes a player into a target seat. False when there is nothing to do,
 *  which is what stops the fixed-point loop above. */
function seat(
  byId: Map<string, MatchLike>,
  targetId: string | null,
  slot: number | null,
  playerId: number | null,
): boolean {
  if (!targetId || !slot || playerId === null) return false;
  const target = byId.get(targetId);
  if (!target) return false;
  const field = slot === 1 ? "p1_id" : "p2_id";
  if (target[field] === playerId) return false;
  target[field] = playerId;
  return true;
}
