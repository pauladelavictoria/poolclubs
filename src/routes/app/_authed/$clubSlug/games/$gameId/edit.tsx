import { createFileRoute, redirect } from "@tanstack/react-router";
import AddGamePage from "@/pages/app/AddGamePage";
import { gameQuery } from "@/queries/games";
import { canEditGame } from "@/libs/algorithms/gamePermissions";

export const Route = createFileRoute(
  "/app/_authed/$clubSlug/games/$gameId/edit",
)({
  staticData: {
    section: "games",
    crumbs: [{ labelKey: "nav.games", to: "/app/$clubSlug/games" }],
  },
  // The club admin's screen, and in the global lobby the players' own. Checked
  // here rather than after render for the same reason the drill editor does it:
  // a redirect on the way in beats a page that paints and then bounces. RLS says
  // the same thing again on the write — this is the door, not the lock
  // (sql/schema.sql).
  //
  // The game is fetched before the check, not after, because who may edit it
  // depends on who is sitting in it.
  loader: async ({ context, params }) => {
    const game = await context.queryClient.ensureQueryData(
      gameQuery(params.gameId),
    );

    if (
      !canEditGame(
        game,
        context.player?.id,
        context.activeClub?.slug,
        context.isClubAdmin,
      )
    ) {
      throw redirect({
        to: "/app/$clubSlug/games",
        params: { clubSlug: params.clubSlug },
      });
    }

    return game;
  },
  component: AddGamePage,
});
