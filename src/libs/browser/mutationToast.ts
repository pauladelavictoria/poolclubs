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
 * Every failure is classified (libs/algorithms/dbError.ts): a refusal says
 * "not allowed", an expired session says so, and `errorKey` covers the rest.
 * Pass dbKeys only for a mutation with better wording for one of those.
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
    const key = dbErrorMessage(err, okKey, { fallback: errorKey, ...dbKeys });
    toast.error(t(key));
    return false;
  }
}
