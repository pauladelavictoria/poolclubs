import { createFileRoute } from "@tanstack/react-router";
import GameDetailPage from "@/pages/app/GameDetailPage";
import { gameQuery } from "@/queries/games";

export const Route = createFileRoute("/app/_authed/$clubSlug/games/$gameId/")({
  staticData: {
    section: "games",
    crumbs: [{ labelKey: "nav.games", to: "/app/$clubSlug/games" }],
  },
  // Primed here so the page paints the score rather than a skeleton: a result
  // opened from a link is one row, and the feed the reader came from may not
  // have it cached.
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(gameQuery(params.gameId)),
  component: GameDetailPage,
});
