import { createFileRoute } from "@tanstack/react-router";
import { ClubTournamentsTab } from "@/pages/public/PublicClubPage";
import { publicClubQuery } from "@/queries/public/clubs";
import { publicTournamentsQuery } from "@/queries/public/tournaments";

/** What is on at this club, and what has been. The club's front page: it is the
 *  thing that changes week to week, and the reason to come back to the page. */
export const Route = createFileRoute("/_public/clubs/$slug/")({
  // The club is already in the cache — the parent loader put it there and threw
  // notFound() if there wasn't one — so this reads it rather than the id being
  // plumbed down through loader data.
  loader: async ({ context, params }) => {
    const club = await context.queryClient.query({
      ...publicClubQuery(params.slug),
      staleTime: "static",
    });
    if (!club) return;
    await context.queryClient.query({
      ...publicTournamentsQuery({ clubId: club.id }),
      staleTime: "static",
    });
  },
  component: ClubTournamentsTab,
});
