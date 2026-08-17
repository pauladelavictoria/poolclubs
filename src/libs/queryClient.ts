import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

const log = (error: unknown) => console.error(error);

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
    queryCache: new QueryCache({ onError: log }),
    mutationCache: new MutationCache({ onError: log }),
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        gcTime: 10 * 60_000,
        retry: 1,
      },
    },
  });
