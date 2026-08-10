import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

const log = (error: unknown) => console.error(error);

export const queryClient = new QueryClient({
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
