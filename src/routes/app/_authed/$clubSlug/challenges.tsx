import { createFileRoute } from "@tanstack/react-router";
import ChallengesPage from "@/pages/app/ChallengesPage";
import { challengesQuery } from "@/queries/challenges";

/** Part of the games section, not a fifth place: a challenge is a game that has
 *  not happened yet. */
export const Route = createFileRoute("/app/_authed/$clubSlug/challenges")({
  staticData: { section: "games" },
  loader: ({ context }) =>
    context.queryClient.query({
      ...challengesQuery(context.activeClubId),
      staleTime: "static",
    }),
  component: ChallengesPage,
});
