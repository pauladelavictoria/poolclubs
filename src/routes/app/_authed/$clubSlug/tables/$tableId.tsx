import { createFileRoute } from "@tanstack/react-router";
import TablePage from "@/pages/app/TablePage";
import { clubTablesQuery, liveMatchesQuery } from "@/queries/live";

export const Route = createFileRoute("/app/_authed/$clubSlug/tables/$tableId")({
  staticData: {
    section: "home",
    crumbs: [{ labelKey: "nav.today", to: "/app/$clubSlug/today" }],
    // A tablet pinned here shows this and nothing else, and even unpinned the
    // page is a scoreboard — neither wants a tab bar under it.
    fullBleed: true,
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(clubTablesQuery(context.activeClubId)),
      context.queryClient.ensureQueryData(liveMatchesQuery(context.activeClubId)),
    ]),
  component: TablePage,
});
