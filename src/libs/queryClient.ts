import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

/**
 * A fresh cache per call, not a module singleton.
 *
 * Under SSR one module scope serves every request, so a shared QueryClient
 * would hand the next visitor the last visitor's club. src/router.tsx calls
 * this once per request on the server and once per page load in the browser.
 *
 * Anything that needs the client reaches it through `useQueryClient()` or the
 * router context, never by importing it.
 */
export const makeQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => console.error(query.queryKey, error),
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _onMutateResult, mutation) =>
        console.error(
          mutation.options.mutationKey ?? mutation.mutationId,
          error,
        ),
    }),
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        gcTime: 10 * 60_000,
        retry: 1,
      },
    },
  });
