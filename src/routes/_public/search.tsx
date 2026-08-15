import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import SearchPage from "@/pages/SearchPage";
import { publicSearchQuery } from "@/queries/public";
import { publicMeta } from "@/libs/publicMeta";

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
      title: "Search · PoolClubs",
      description:
        "Search clubs, players, tournaments and drills across PoolClubs.",
      path: "/search",
      origin: match.context.origin,
      fallback: "clubs",
    }),
  }),
  component: SearchPage,
});
