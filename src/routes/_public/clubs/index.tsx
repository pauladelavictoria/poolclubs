import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import PublicClubsPage from "@/pages/PublicClubsPage";
import { publicClubsQuery } from "@/queries/public";
import { publicMeta } from "@/libs/publicMeta";

/**
 * Query and facets in the URL, the same rule the app's own filtered lists follow
 * — here it also means a search result is a link somebody can send, and a page a
 * crawler can index.
 *
 * Defaults are deliberately absent.
 *
 * A `.default()` makes the validated search differ from the one in the address
 * bar, and the router answers that with a 307 to the canonical URL — so `/clubs`
 * redirected to `/clubs?sort=members&page=1`. That is the URL in the sitemap and
 * the one people link to; it must return the page, not a redirect. The defaults
 * live in the query factory and at the two read sites instead.
 */
const searchSchema = z.object({
  q: z.string().trim().max(80).optional(),
  sort: z.enum(["members", "name", "new"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export const Route = createFileRoute("/_public/clubs/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(publicClubsQuery(deps)),
  head: ({ match }) => ({
    meta: publicMeta({
      title: "Pool clubs · PoolClubs",
      description:
        "Browse pool clubs on PoolClubs. Find a club near you, see its roster, its rankings and its tournaments.",
      path: "/clubs",
      origin: match.context.origin,
      fallback: "clubs",
    }),
  }),
  component: PublicClubsPage,
});
