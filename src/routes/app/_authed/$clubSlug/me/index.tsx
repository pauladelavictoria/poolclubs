import { createFileRoute } from "@tanstack/react-router";
import PlayerDetailPage, { PLAYER_GAMES_LIMIT } from "@/pages/PlayerDetailPage";
import { gamesQuery } from "@/queries/games";

/**
 * Your own profile. The same page the roster leads to, at its own address: this
 * is where the drawer's "Me" points, and arriving here is not arriving from the
 * player list, so there is no crumb back to one.
 *
 * It used to redirect to /players/<your id>, which made the two indistinguishable.
 */
export const Route = createFileRoute("/app/_authed/$clubSlug/me/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      gamesQuery(context.activeClubId, {
        playerId: context.player.id,
        pageSize: PLAYER_GAMES_LIMIT,
      }),
    ),
  component: MeRoute,
});

function MeRoute() {
  const { player } = Route.useRouteContext();
  return <PlayerDetailPage playerId={player.id} />;
}
