import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import SearchPage from "@/pages/public/SearchPage";
import { publicSearchQuery } from "@/queries/public/search";
import { publicMeta } from "@/libs/algorithms/publicMeta";

const searchSchema = z.object({
  q: z.string().trim().max(80).optional(),
});

export const Route = createFileRoute("/_public/search")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ q: search.q }),
  // Nothing to fetch for an empty box, and priming a query for "" would cache a
  // result set that means nothing.
  loader: ({ context, deps }) =>
    deps.q?.trim()
      ? context.queryClient.ensureQueryData(publicSearchQuery(deps.q))
      : null,
  head: ({ match }) => ({
    meta: publicMeta({
      title: "Buscar · PoolClubs",
      description: "Busca clubes, jugadores, torneos y ejercicios.",
      path: "/search",
      origin: match.context.origin,
      fallback: "clubs",
    }),
  }),
  component: SearchPage,
});
