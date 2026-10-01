import { createFileRoute, redirect } from "@tanstack/react-router";
import { LAST_CLUB_COOKIE, readPref } from "@/libs/prefs";

/**
 * /app has no page of its own any more — every page belongs to a club, and the
 * club is in the URL. So this is a signpost: go to the one club you're in, ask
 * which one when there's more than one, and when there is none, go to the page
 * that says so.
 *
 * With more than one active membership, the club this device was last in wins
 * (a cookie ClubLayout writes); only without one, or when it is no longer an
 * active membership, does this defer to /select-club.
 */
export const Route = createFileRoute("/app/_authed/")({
  beforeLoad: ({ context }) => {
    const active = context.memberships.filter((m) => m.status === "active");

    if (active.length > 1) {
      const lastSlug = readPref(LAST_CLUB_COOKIE);
      const last = active.find((m) => m.club?.slug === lastSlug);
      if (last)
        throw redirect({
          to: "/app/$clubSlug",
          params: { clubSlug: last.club!.slug },
        });
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
