import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /app has no page of its own any more — every page belongs to a club, and the
 * club is in the URL. So this is a signpost: go to the one club you're in, ask
 * which one when there's more than one, or point at the only way in if you are
 * not in one yet.
 *
 * There's no "last in" or "default" any more — picking one silently for
 * somebody in several clubs was arbitrary, so with more than one active
 * membership this always defers to /select-club instead of guessing.
 */
export const Route = createFileRoute("/app/_authed/")({
  beforeLoad: ({ context }) => {
    const active = context.memberships.filter(
      (m) => m.status === "active" && m.club,
    );

    if (active.length === 0) {
      // Either brand new, or every membership is still awaiting approval.
      throw redirect({ to: "/app/clubs/new" });
    }

    if (active.length > 1) {
      throw redirect({ to: "/app/select-club" });
    }

    throw redirect({
      to: "/app/$clubSlug",
      params: { clubSlug: active[0].club!.slug },
    });
  },
});
