/**
 * List edits for realtime payloads. Pure, so realtime.ts stays about wiring and
 * this stays about what a row arriving actually means.
 */

/** Negative ids are the optimistic stand-ins from libs/optimistic.ts. */
const isOptimistic = (row: { id: number }) => row.id < 0;

/**
 * Add `incoming`, or replace it if it is already there.
 *
 * Also retires the optimistic row it confirms: your own insert reaches you
 * twice — once as the stand-in you added on tap, once over the socket — and
 * without this the comment you just wrote appears twice until a refetch.
 * `matchesOptimistic` decides what "the same row" means, since the stand-in has
 * a made-up id and the real one does not.
 */
export function upsertRow<T extends { id: number }>(
  rows: T[],
  incoming: T,
  matchesOptimistic: (candidate: T, incoming: T) => boolean,
): T[] {
  const at = rows.findIndex((r) => r.id === incoming.id);
  if (at !== -1) {
    const next = rows.slice();
    next[at] = incoming;
    return next;
  }

  return [
    ...rows.filter((r) => !(isOptimistic(r) && matchesOptimistic(r, incoming))),
    incoming,
  ];
}

export function removeRow<T extends { id: number }>(rows: T[], id: number): T[] {
  return rows.filter((r) => r.id !== id);
}
