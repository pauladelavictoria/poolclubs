import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import ClubLayout from "@/components/layout/ClubLayout";
import { playersQuery } from "@/queries/players";
import { isKioskAllowed, readKioskTable } from "@/libs/browser/kiosk";

/**
 * A club, and everything inside it.
 *
 * The slug is resolved against the memberships already on the context, so this
 * costs no query: if it isn't one of yours, it isn't found. That is deliberate —
 * a wrong slug must not tell you whether the club exists.
 *
 * The app's chrome (ClubLayout) is mounted here too. It used to be one level
 * up, on /app, but every link in the rail and the drawer now needs to know
 * which club it is pointing at.
 */
export const Route = createFileRoute("/app/_authed/$clubSlug")({
  beforeLoad: ({ context, params, location }) => {
    const membership = context.memberships.find(
      (m) => m.club?.slug === params.clubSlug,
    );

    // A club you are not in reads the same as a club that does not exist.
    if (!membership?.club) throw notFound();

    // A tablet bolted to a table goes back to it. The cookie is readable on the
    // server, so this happens before anything renders rather than as a flash of
    // the wrong page — and it is what makes the device self-healing: a reload,
    // a stray swipe, or the PWA booting to its start_url all land here.
    const kioskTable = readKioskTable();
    if (
      kioskTable !== null &&
      !isKioskAllowed(location.pathname, params.clubSlug)
    )
      throw redirect({
        to: "/app/$clubSlug/tables/$tableId",
        params: { clubSlug: params.clubSlug, tableId: String(kioskTable) },
        replace: true,
      });

    return {
      player: membership,
      activeClub: membership.club,
      activeClubId: membership.club_id,
      /** Signed in, approved, and looking at a club. Everything club-scoped
       *  waits on this — a pending member has a player row but may read
       *  nothing. */
      isMember: membership.status === "active",
      isClubAdmin: membership.club.owner_id === context.user.id,
    };
  },

  // The roster: nearly every page under here needs it, and prefetching once at
  // the layout means the pages below hit a warm cache rather than each waiting
  // on their own round trip.
  loader: ({ context }) => {
    if (!context.isMember) return;
    void context.queryClient.ensureQueryData(
      playersQuery(context.activeClubId),
    );
  },

  component: ClubLayout,
});
