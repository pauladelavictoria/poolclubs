import { createFileRoute } from "@tanstack/react-router";
import PlayerDetailPage, { PLAYER_GAMES_LIMIT } from "@/pages/PlayerDetailPage";
import { gamesQuery } from "@/queries/games";

export const Route = createFileRoute(
  "/app/_authed/$clubSlug/players/$playerId/",
)({
  // Reached from the roster, so it says where it was reached from. Your own
  // profile is /me, which has no list behind it and therefore no crumb.
  staticData: {
    crumbs: [{ labelKey: "players.title", to: "/app/$clubSlug/players" }],
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      gamesQuery(context.activeClubId, {
        playerId: Number(params.playerId),
        pageSize: PLAYER_GAMES_LIMIT,
      }),
    ),
  component: PlayerRoute,
});

function PlayerRoute() {
  const { playerId } = Route.useParams();
  return <PlayerDetailPage playerId={Number(playerId)} />;
}
