import { createFileRoute } from "@tanstack/react-router";
import DashboardPage from "@/pages/DashboardPage";
import { gamesQuery } from "@/queries/games";
import { tournamentsQuery } from "@/queries/tournaments";
import { challengesQuery } from "@/queries/challenges";

/** The lobby: where the four sections show up. */
export const Route = createFileRoute("/app/_authed/$clubSlug/")({
  staticData: { section: "home" },
  loader: async ({ context }) => {
    const clubId = context.activeClubId;
    // In parallel, and awaited: this is the first paint, so the page is worth
    // waiting for rather than streaming four spinners.
    await Promise.all([
      context.queryClient.ensureQueryData(gamesQuery(clubId)),
      context.queryClient.ensureQueryData(tournamentsQuery(clubId)),
      context.queryClient.ensureQueryData(challengesQuery(clubId)),
    ]);
  },
  component: DashboardPage,
});
