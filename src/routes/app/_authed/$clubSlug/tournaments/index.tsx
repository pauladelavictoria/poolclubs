import { createFileRoute } from "@tanstack/react-router";
import TournamentsPage from "@/pages/TournamentsPage";
import { tournamentsQuery } from "@/queries/tournaments";

export const Route = createFileRoute("/app/_authed/$clubSlug/tournaments/")({
  staticData: { section: "tournaments" },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(tournamentsQuery(context.activeClubId)),
  component: TournamentsPage,
});
