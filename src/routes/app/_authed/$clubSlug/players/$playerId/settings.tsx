import { createFileRoute, redirect } from "@tanstack/react-router";
import PlayerSettingsPage from "@/pages/app/PlayerSettingsPage";
import { PLAYER_CRUMBS } from "@/libs/crumbs";

export const Route = createFileRoute(
  "/app/_authed/$clubSlug/players/$playerId/settings",
)({
  staticData: { crumbs: PLAYER_CRUMBS },
  // Your own settings and nobody else's. This used to be a <Navigate> inside the
  // component, which meant the page rendered and fetched first.
  beforeLoad: ({ context, params }) => {
    if (context.player.id !== Number(params.playerId)) {
      throw redirect({
        to: "/app/$clubSlug/players/$playerId",
        params,
      });
    }
  },
  component: PlayerSettingsPage,
});
