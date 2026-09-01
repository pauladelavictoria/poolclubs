import { createFileRoute, redirect } from "@tanstack/react-router";
import ClubSelectPage from "@/pages/app/ClubSelectPage";
import { isRealClub } from "@/libs/algorithms/features";

/**
 * Outside $clubSlug, like clubs/new: choosing a club is the one thing you do
 * before you're inside one. Reached only from /app's signpost when there's
 * more than one active membership — guarded here too, so a bookmarked or
 * shared link to this URL still bounces a single-club member straight past it.
 */
export const Route = createFileRoute("/app/_authed/select-club")({
  beforeLoad: ({ context }) => {
    // Real clubs only, same as the signpost: everybody is in the global lobby,
    // so counting it would make this screen appear for people with one club.
    const active = context.memberships.filter(
      (m) => m.status === "active" && isRealClub(m.club),
    );
    if (active.length < 2) throw redirect({ to: "/app" });
  },
  component: ClubSelectPage,
});
