import { createFileRoute } from "@tanstack/react-router";
import TvPage from "@/pages/app/TvPage";
import { clubTablesQuery, liveMatchesQuery } from "@/queries/live";

/**
 * The screen on the wall. Nested inside the club layout rather than escaping it
 * with a trailing underscore, so it keeps the club's accent and the warm roster
 * — the chrome is handled by fullBleed and by element fullscreen instead.
 *
 * Today's games are not prefetched: which day it is rolls over at midnight on
 * the display itself, so the page decides it rather than the loader.
 */
export const Route = createFileRoute("/app/_authed/$clubSlug/tv")({
  staticData: { section: "home", fullBleed: true },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query({
        ...liveMatchesQuery(context.activeClubId),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...clubTablesQuery(context.activeClubId),
        staleTime: "static",
      }),
    ]),
  component: TvPage,
});
