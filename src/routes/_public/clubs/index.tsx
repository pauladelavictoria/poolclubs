import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import PublicClubsPage from "@/pages/public/PublicClubsPage";
import { publicClubPinsQuery, publicClubsQuery } from "@/queries/public/clubs";
import { publicMeta } from "@/libs/algorithms/publicMeta";

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
  /**
   * The pins are loaded here rather than on the client, and both queries run
   * together.
   *
   * Fetched from the component, the map section did not exist in the server's
   * HTML at all — it appeared once the query resolved and pushed the whole grid
   * down the page. Loading it here means the server renders the section, the
   * heading and the map's frame at their final size, and only the canvas inside
   * arrives late.
   *
   * The pin query ignores `deps`: it is every listed club, not this page of the
   * current sort, so paging or re-sorting reads it straight from the cache.
   */
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.query({
        ...publicClubsQuery(deps),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...publicClubPinsQuery(),
        staleTime: "static",
      }),
    ]),
  head: ({ match }) => ({
    meta: publicMeta({
      title: "Clubes de billar · PoolClubs",
      description:
        "Explora clubes de billar. Encuentra uno cerca de ti y consulta sus socios, sus rankings y sus torneos.",
      path: "/clubs",
      origin: match.context.origin,
      fallback: "clubs",
    }),
  }),
  component: PublicClubsPage,
});
