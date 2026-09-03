import { createFileRoute } from "@tanstack/react-router";
import DashboardPage from "@/pages/app/DashboardPage";
import { FEED_PAGE_SIZE, gamesQuery } from "@/queries/games";
import { drillsQuery } from "@/queries/drills";
import { myTournamentIdsQuery, tournamentsQuery } from "@/queries/tournaments";
import { challengesQuery } from "@/queries/challenges";
import { DRILLS_ENABLED } from "@/libs/algorithms/features";

/** The lobby: where the four sections show up. */
export const Route = createFileRoute("/app/_authed/$clubSlug/")({
  staticData: { section: "home" },
  loader: async ({ context }) => {
    const clubId = context.activeClubId;
    // In parallel, and awaited: this is the first paint, so the page is worth
    // waiting for rather than streaming four spinners.
    await Promise.all([
      context.queryClient.query({
        ...gamesQuery(clubId, { pageSize: FEED_PAGE_SIZE }),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...tournamentsQuery(clubId),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...challengesQuery(clubId),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...myTournamentIdsQuery(context.player.id, clubId),
        staleTime: "static",
      }),
      ...(DRILLS_ENABLED
        ? [
            context.queryClient.query({
              ...drillsQuery(clubId),
              staleTime: "static",
            }),
          ]
        : []),
    ]);
  },
  component: DashboardPage,
});
