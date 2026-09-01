import { createFileRoute, redirect } from "@tanstack/react-router";
import { GLOBAL_CLUB_SLUG, isRealClub } from "@/libs/algorithms/features";

/**
 * /app has no page of its own any more — every page belongs to a club, and the
 * club is in the URL. So this is a signpost: go to the one club you're in, ask
 * which one when there's more than one, or drop you in the global lobby if you
 * are not in one yet.
 *
 * There's no "last in" or "default" any more — picking one silently for
 * somebody in several clubs was arbitrary, so with more than one active
 * membership this always defers to /select-club instead of guessing.
 */
export const Route = createFileRoute("/app/_authed/")({
  beforeLoad: ({ context }) => {
    // The global lobby is not a club for the purposes of this decision —
    // everybody is in it, so counting it would send every single-club member to
    // the picker on every visit.
    const active = context.memberships.filter(
      (m) => m.status === "active" && isRealClub(m.club),
    );

    if (active.length === 0) {
      // Brand new, or every real membership is still awaiting approval: the
      // lobby is somewhere to actually be in the meantime. getSession has
      // already put them in it.
      throw redirect({
        to: "/app/$clubSlug",
        params: { clubSlug: GLOBAL_CLUB_SLUG },
      });
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
