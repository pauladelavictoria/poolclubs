import { createFileRoute } from "@tanstack/react-router";
import PlayersPage from "@/pages/app/PlayersPage";
import { gamesQuery } from "@/queries/games";

/** Reading the roster and administering it are different jobs: this is the
 *  read-only card list, club settings keeps add/approve/remove. */
export const Route = createFileRoute("/app/_authed/$clubSlug/players/")({
  // The roster itself is primed by the club layout; the cards also show Elo.
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(gamesQuery(context.activeClubId)),
  component: PlayersPage,
});
