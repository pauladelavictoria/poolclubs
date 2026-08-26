import type { Key } from "@/i18n";

/**
 * What a failed write actually was.
 *
 * Every mutation in this feature used to toast one guess — "that table is
 * taken" — whatever came back, which is fine while the guess is right and a
 * dead end the moment it is not: somebody reads a message about a table when
 * the real answer was that the row was refused by a policy.
 *
 * Postgres says which. 23505 is the one-per-table unique index; 42501 and
 * PostgREST's own PGRST301/PGRST116 are RLS turning the write away; a
 * `RAISE EXCEPTION` from one of the guards in sql/live-night.sql arrives as
 * P0001 carrying its own sentence.
 *
 * The real message is always logged, because the three keys below are a
 * summary and the console is where the cause lives.
 */
type DbError = { code?: string; message?: string; details?: string } | null;

const asDbError = (error: unknown): DbError =>
  typeof error === "object" && error !== null ? (error as DbError) : null;

export function liveWriteMessage(error: unknown, where: string): Key {
  const db = asDbError(error);
  // The whole object, not three fields: a failure that never reached the
  // database has no code at all — a TypeError from a browser API that is
  // missing on that device, say — and those three fields would print
  // "undefined undefined undefined".
  console.error(`${where}:`, db?.code ?? "(no code)", db?.message, error);

  if (db?.code === "23505") return "live.startError";
  if (db?.code === "42501" || db?.code?.startsWith("PGRST"))
    return "live.startDenied";

  // A guard's own exception. Its text is the specific thing that was wrong, so
  // it is worth showing rather than flattening into "something went wrong".
  if (db?.code === "P0001" && db.message) return "live.startRefused";

  return "common.error";
}

/** The guard's own sentence, for the message that shows it. */
export const dbMessageOf = (error: unknown) => asDbError(error)?.message ?? "";
