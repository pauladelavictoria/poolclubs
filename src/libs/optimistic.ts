// Extension is explicit so `optimistic.check.ts` runs under bare node.
import { queryClient } from "./queryClient.ts";

/**
 * The snapshot / patch / rollback trio every optimistic list mutation repeats.
 * Spread the result into useMutation.
 *
 * `patch` must return a new array — it is the cache, not a copy.
 */
export function optimisticList<TVars, TRow>(
  queryKey: readonly unknown[],
  patch: (rows: TRow[], vars: TVars) => TRow[],
) {
  return {
    onMutate: async (vars: TVars) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<TRow[]>(queryKey);
      queryClient.setQueryData<TRow[]>(queryKey, (rows) =>
        patch(rows ?? [], vars),
      );
      return { prev };
    },
    onError: (_err: unknown, _vars: TVars, ctx: { prev?: TRow[] } | undefined) =>
      queryClient.setQueryData(queryKey, ctx?.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  };
}

/** Placeholder id for a row that has not been inserted yet. Negative so it can
 *  never collide with a real serial id, unique enough to use as a React key. */
export const tempId = () => -Date.now();
