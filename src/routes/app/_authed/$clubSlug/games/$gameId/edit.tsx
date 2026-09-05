import { createFileRoute, redirect } from "@tanstack/react-router";
import AddGamePage from "@/pages/app/AddGamePage";
import { gameQuery } from "@/queries/games";

export const Route = createFileRoute(
  "/app/_authed/$clubSlug/games/$gameId/edit",
)({
  staticData: {
    section: "games",
    crumbs: [{ labelKey: "nav.games", to: "/app/$clubSlug/games" }],
  },
  // The club admin's screen. Checked here rather than after render for the same
  // reason the drill editor does it: a redirect on the way in beats a page that
  // paints and then bounces. RLS says the same thing again on the write — this
  // is the door, not the lock (sql/schema.sql).
  loader: async ({ context, params }) => {
    if (!context.isClubAdmin) {
      throw redirect({
        to: "/app/$clubSlug/games",
        params: { clubSlug: params.clubSlug },
      });
    }

    const game = await context.queryClient.query({
      ...gameQuery(params.gameId),
      staleTime: "static",
    });

    return game;
  },
  component: AddGamePage,
});
