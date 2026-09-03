import { createFileRoute } from "@tanstack/react-router";
import TablePage from "@/pages/app/TablePage";
import { clubTablesQuery, liveMatchesQuery } from "@/queries/live";

export const Route = createFileRoute("/app/_authed/$clubSlug/tables/$tableId")({
  staticData: {
    section: "home",
    crumbs: [{ labelKey: "nav.night", to: "/app/$clubSlug/night" }],
    // A tablet pinned here shows this and nothing else, and even unpinned the
    // page is a scoreboard — neither wants a tab bar under it.
    fullBleed: true,
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query({
        ...clubTablesQuery(context.activeClubId),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...liveMatchesQuery(context.activeClubId),
        staleTime: "static",
      }),
    ]),
  component: TablePage,
});
