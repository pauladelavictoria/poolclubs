import { createFileRoute } from "@tanstack/react-router";
import TournamentsPage from "@/pages/app/TournamentsPage";
import { tournamentsQuery } from "@/queries/tournaments";

export const Route = createFileRoute("/app/_authed/$clubSlug/tournaments/")({
  staticData: { section: "tournaments" },
  loader: ({ context }) =>
    context.queryClient.query({
      ...tournamentsQuery(context.activeClubId),
      staleTime: "static",
    }),
  component: TournamentsPage,
});
