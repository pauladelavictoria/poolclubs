import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /app has no page of its own any more — every page belongs to a club, and the
 * club is in the URL. So this is a signpost: go to the club you were last in, or
 * to the only way in if you are not in one yet.
 *
 * "Last in" is no longer remembered in localStorage. The URL is the memory now,
 * and the browser already keeps those.
 */
export const Route = createFileRoute("/app/_authed/")({
  beforeLoad: ({ context }) => {
    const active = context.memberships.find((m) => m.status === "active");

    if (!active?.club) {
      // Either brand new, or every membership is still awaiting approval.
      throw redirect({ to: "/app/clubs/new" });
    }

    throw redirect({
      to: "/app/$clubSlug",
      params: { clubSlug: active.club.slug },
    });
  },
});
