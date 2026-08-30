import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import PublicPlayersPage from "@/pages/public/PublicPlayersPage";
import { publicPlayersQuery } from "@/queries/public/players";
import { publicMeta } from "@/libs/algorithms/publicMeta";

/**
 * Defaults are deliberately absent from this schema.
 *
 * A `.default()` makes the validated search differ from the one in the address
 * bar, and the router answers that with a 307 to the canonical URL — so `/clubs`
 * redirected to `/clubs?sort=members&page=1`. That is the URL in the sitemap and
 * the one people link to; it must return the page, not a redirect. The defaults
 * live in the query factory and at the two read sites instead.
 */
const searchSchema = z.object({
  q: z.string().trim().max(80).optional(),
  clubId: z.coerce.number().int().positive().optional(),
  category: z.coerce.number().int().min(1).max(3).optional(),
  sort: z.enum(["name", "category"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export const Route = createFileRoute("/_public/players/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(publicPlayersQuery(deps)),
  head: ({ match }) => ({
    meta: publicMeta({
      title: "Players · PoolClubs",
      description:
        "Every player on PoolClubs, across every club. Search by name, filter by club or division.",
      path: "/players",
      origin: match.context.origin,
      fallback: "players",
    }),
  }),
  component: PublicPlayersPage,
});
