import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import ClubLayout from "@/components/layout/ClubLayout";
import { playersQuery } from "@/queries/players";
import { isKioskAllowed, readKioskTable } from "@/libs/browser/kiosk";

/**
 * A club, and everything inside it.
 *
 * The slug is resolved against the memberships already on the context, so this
 * costs no query. A club that is not one of yours hands you to /app/join/<slug>
 * rather than to a 404: you are somebody with an account looking at a club, and
 * "this page does not exist" is a lie when the honest answer is "you are not in
 * it yet, here is how to ask".
 *
 * This used to answer notFound() so that a wrong slug could not tell you whether
 * a club existed. That secrecy is gone anyway — /app/join/<slug> is public and
 * club_preview is granted to anon (sql/schema.sql), so the name is readable by
 * anybody holding the slug. The join page is also what answers for a slug that
 * really is nothing, so a typo still ends somewhere that says so.
 *
 * The app's chrome (ClubLayout) is mounted here too. It used to be one level
 * up, on /app, but every link in the rail and the drawer now needs to know
 * which club it is pointing at.
 */
export const Route = createFileRoute("/app/_authed/$clubSlug")({
  validateSearch: z.object({
    // "I came here to join." Set on the link the sign-up confirmation mail comes
    // back to, so the club's own URL is what lands in the mail rather than the
    // invite page. `.catch` because it is on a URL a stranger can type.
    join: z.literal(1).optional().catch(undefined),
  }),

  beforeLoad: ({ context, params, location, search }) => {
    const membership = context.memberships.find(
      (m) => m.club?.slug === params.clubSlug,
    );

    // Not a club of yours. Joining is what /app/join/<slug> is for, and it
    // knows every case this one does not: the club that does not exist, the
    // request already waiting, the one that turned you down.
    //
    // `auto` carries the sign-up round trip through — arriving with ?join=1
    // means the intent was expressed before the account existed, so the request
    // is filed on arrival rather than asked for a second time.
    if (!membership?.club)
      throw redirect({
        to: "/app/join/$slug",
        params: { slug: params.clubSlug },
        search: search.join ? { auto: 1 } : {},
        replace: true,
      });

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
    void context.queryClient.query({
      ...playersQuery(context.activeClubId),
      staleTime: "static",
    });
  },

  component: ClubLayout,
});
