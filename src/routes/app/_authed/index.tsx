import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /app has no page of its own any more — every page belongs to a club, and the
 * club is in the URL. So this is a signpost: go to the one club you're in, ask
 * which one when there's more than one, and when there is none, go to the page
 * that says so.
 *
 * There's no "last in" or "default" any more — picking one silently for
 * somebody in several clubs was arbitrary, so with more than one active
 * membership this always defers to /select-club instead of guessing.
 */
export const Route = createFileRoute("/app/_authed/")({
  beforeLoad: ({ context }) => {
    const active = context.memberships.filter((m) => m.status === "active");

    if (active.length > 1) {
      throw redirect({ to: "/app/select-club" });
    }

    if (active.length === 1) {
      throw redirect({
        to: "/app/$clubSlug",
        params: { clubSlug: active[0].club!.slug },
      });
    }

    // Waiting on an admin: the club's own page is where that is said, and it is
    // somewhere to come back to and refresh rather than a dead end.
    const waiting = context.memberships.find((m) => m.club?.slug);
    if (waiting) {
      throw redirect({
        to: "/app/$clubSlug",
        params: { clubSlug: waiting.club!.slug },
      });
    }

    throw redirect({ to: "/app/clubs/none" });
  },
});
