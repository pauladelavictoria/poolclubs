import { createFileRoute, redirect } from "@tanstack/react-router";
import ClubSelectPage from "@/pages/app/ClubSelectPage";

/**
 * Outside $clubSlug, like clubs/new: choosing a club is the one thing you do
 * before you're inside one. Reached only from /app's signpost when there's
 * more than one active membership — guarded here too, so a bookmarked or
 * shared link to this URL still bounces a single-club member straight past it.
 */
export const Route = createFileRoute("/app/_authed/select-club")({
  beforeLoad: ({ context }) => {
    const active = context.memberships.filter(
      (m) => m.status === "active" && m.club,
    );
    if (active.length < 2) throw redirect({ to: "/app" });
  },
  component: ClubSelectPage,
});
