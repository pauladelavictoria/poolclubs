import { createFileRoute } from "@tanstack/react-router";
import TournamentPage from "@/pages/app/TournamentPage";
import { tournamentQuery } from "@/queries/tournaments";
import { gamesQuery } from "@/queries/games";

export const Route = createFileRoute(
  "/app/_authed/$clubSlug/tournaments/$tournamentId",
)({
  staticData: {
    section: "tournaments",
    crumbs: [{ labelKey: "nav.tournaments", to: "/app/$clubSlug/tournaments" }],
  },
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        tournamentQuery(Number(params.tournamentId)),
      ),
      // The seeding and the league tables are drawn from club Elo, so the page
      // needs the whole games list as well as the fixtures.
      context.queryClient.ensureQueryData(gamesQuery(context.activeClubId)),
    ]);
  },
  component: TournamentPage,
});
