import { createFileRoute } from "@tanstack/react-router";
import { ClubGamesTab, CLUB_GAMES_LIMIT } from "@/pages/public/PublicClubPage";
import { gamesQuery } from "@/queries/games";
import { publicClubQuery } from "@/queries/public/clubs";

/** The results tape, as far back as a public page carries it. */
export const Route = createFileRoute("/_public/clubs/$slug/games")({
  // The club is already in the cache — the parent loader put it there and threw
  // notFound() if there wasn't one — so this reads it rather than the id being
  // plumbed down through loader data.
  loader: async ({ context, params }) => {
    const club = await context.queryClient.ensureQueryData(
      publicClubQuery(params.slug),
    );
    if (!club) return;
    await context.queryClient.ensureQueryData(
      gamesQuery(club.id, { pageSize: CLUB_GAMES_LIMIT }),
    );
  },
  component: ClubGamesTab,
});
