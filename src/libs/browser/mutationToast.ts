import { toast } from "react-toastify";
import { dbErrorMessage, type DbErrorKeys } from "@/libs/algorithms/dbError";
import type { Key } from "@/i18n";

type T = (key: Key, vars?: Record<string, string | number>) => string;

/**
 * Await a mutation, toast on either outcome. Four pages had this same
 * try/catch wrapped around `mutateAsync` by hand; the mutation's own
 * `onSuccess` (cache refresh, usually) still runs regardless — react-query
 * fires both — this only owns the toast.
 *
 * `errorKey` is shown for anything dbKeys doesn't have a better answer for —
 * pass a category in dbKeys (see libs/algorithms/dbError.ts) for a mutation
 * whose failure reason is worth telling apart, e.g. `{ denied: "..." }` for
 * one an RLS policy can plausibly refuse.
 *
 * Returns whether it succeeded, so a caller that has more to do on success
 * (closing a modal, say) doesn't do it after a failure.
 */
export async function runMutation(
  work: Promise<unknown>,
  t: T,
  okKey: Key,
  errorKey: Key = "common.error",
  dbKeys?: DbErrorKeys,
): Promise<boolean> {
  try {
    await work;
    toast.success(t(okKey));
    return true;
  } catch (err) {
    const key = dbKeys
      ? dbErrorMessage(err, okKey, { fallback: errorKey, ...dbKeys })
      : errorKey;
    toast.error(t(key));
    return false;
  }
}
