import type { Key } from "@/i18n";

/**
 * What a failed write actually was.
 *
 * Every mutation used to toast one guess — "something went wrong" — whatever
 * came back, which is fine while the guess is right and a dead end the moment
 * it is not: somebody reads a generic message when the real answer was that
 * the row was refused by a policy, or that it already existed.
 *
 * Postgres says which. 23505 is a unique index; 42501 and PostgREST's own
 * PGRST301/PGRST116 are RLS turning the write away; a `RAISE EXCEPTION` from
 * one of the database's own guards (sql/schema.sql, for the live-match
 * ones) arrives as P0001 carrying its own sentence.
 *
 * The caller supplies the key for each category it can tell a better story
 * about — a duplicate table label reads differently from a duplicate
 * tournament name — and falls back to `common.error` for anything it can't.
 * The real message is always logged, because a translated key is a summary
 * and the console is where the cause lives.
 */
type DbError = { code?: string; message?: string; details?: string } | null;

const asDbError = (error: unknown): DbError =>
  typeof error === "object" && error !== null ? (error as DbError) : null;

export type DbErrorKeys = {
  /** 23505 — a unique index refused it. */
  duplicate?: Key;
  /** 42501 or a PostgREST PGRST3xx/PGRST1xx — RLS turned it away. */
  denied?: Key;
  /** P0001 — one of the database's own guards raised it. Only worth a key
   *  when the guard's message is itself the useful part. */
  refused?: Key;
  /** Anything unclassified — a network failure, a client-side throw. Defaults
   *  to `common.error`; a caller with its own better generic ("Could not
   *  update the player") can still show it here. */
  fallback?: Key;
};

/** Starting or abandoning a live match — the one place all three categories
 *  have their own accurate wording today. */
export const LIVE_MATCH_KEYS: DbErrorKeys = {
  duplicate: "live.startError",
  denied: "live.startDenied",
  refused: "live.startRefused",
};

export function dbErrorMessage(
  error: unknown,
  where: string,
  keys: DbErrorKeys = {},
): Key {
  const db = asDbError(error);
  // The whole object, not three fields: a failure that never reached the
  // database has no code at all — a TypeError from a browser API that is
  // missing on that device, say — and those three fields would print
  // "undefined undefined undefined".
  console.error(`${where}:`, db?.code ?? "(no code)", db?.message, error);

  const fallback = keys.fallback ?? "common.error";
  if (db?.code === "23505") return keys.duplicate ?? fallback;
  if (db?.code === "42501" || db?.code?.startsWith("PGRST"))
    return keys.denied ?? fallback;
  if (db?.code === "P0001" && db.message) return keys.refused ?? fallback;

  return fallback;
}
