import { createFileRoute } from "@tanstack/react-router";
import ObsDockPage from "@/pages/app/ObsDockPage";
import { clubTablesQuery, liveMatchesQuery } from "@/queries/live";
import { playersQuery } from "@/queries/players";

/**
 * The operator's Custom Browser Dock — see
 * docs/youtube-streaming.md Phase 1.5b. Reached by pasting this page's own
 * URL into OBS, not from the app's nav, the same way invite/print is reached
 * from a link rather than a nav item.
 *
 * No admin guard: any member may already see every live score from the club
 * page, so a compact version of the same thing is not a new permission.
 */
export const Route = createFileRoute("/app/_authed/$clubSlug/obs-dock")({
  staticData: {
    crumbs: [{ labelKey: "nav.clubSettings", to: "/app/$clubSlug/club/tables" }],
  },
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
      context.queryClient.query({
        ...playersQuery(context.activeClubId),
        staleTime: "static",
      }),
    ]),
  component: ObsDockPage,
});
