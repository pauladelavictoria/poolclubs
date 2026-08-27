import { Suspense, useEffect, useRef, useState } from "react";
import {
  Outlet,
  createFileRoute,
  notFound,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import AppHeader from "@/components/layout/AppHeader";
import JoinRequestBanner from "@/components/layout/JoinRequestBanner";
import AppPrompts from "@/components/layout/AppPrompts";
import NavDrawer from "@/components/layout/NavDrawer";
import NavRail from "@/components/layout/NavRail";
import { PageSkeleton } from "@/components/ui/Skeleton";
import ClubOnboardingPage from "@/pages/app/ClubOnboardingPage";
import ClubThemeStyle from "@/components/club/ClubThemeStyle";
import { playersQuery } from "@/queries/players";
import { useRouteMeta } from "@/libs/routeMeta";
import { isKioskAllowed, readKioskTable } from "@/libs/kiosk";
import KioskBar from "@/components/layout/KioskBar";

/**
 * A club, and everything inside it.
 *
 * The slug is resolved against the memberships already on the context, so this
 * costs no query: if it isn't one of yours, it isn't found. That is deliberate —
 * a wrong slug must not tell you whether the club exists.
 *
 * This is also where the app's chrome lives. It used to be one level up, on
 * /app, but every link in the rail and the drawer now needs to know which club
 * it is pointing at.
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
    if (kioskTable !== null && !isKioskAllowed(location.pathname, params.clubSlug))
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

function ClubLayout() {
  const { activeClub, isMember } = Route.useRouteContext();
  // A page that is the whole screen — the live scoreboard — keeps neither the
  // tab bar nor the room reserved for it. See RouteMeta.fullBleed.
  const { fullBleed } = useRouteMeta();
  const kioskTable = readKioskTable();
  // A tablet on a rail wants the browser's chrome gone as much as the app's.
  // Element fullscreen, so it is the shell that fills the screen and not the
  // document — the same mechanism the wall display and the scoreboard use.
  // The shell fullscreen acts on. The bar owns the button; the ref has to be
  // here, because this is what renders the element.
  const kioskRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const scroller = useRef<HTMLElement>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // A drawer the pointer opened is one the pointer should be able to put away;
  // one opened from a button stays until it is dismissed.
  const [byPointer, setByPointer] = useState(false);

  // Every page under a club shares its accent, so it is set here rather than in
  // each page that happens to render something coloured.
  const accent = <ClubThemeStyle color={activeClub?.theme_color} />;

  // The page scrolls, the chrome does not — so the scrollbar lives inside the
  // content and taking or freeing it can't move the bar or the tabs. Router
  // scroll restoration only knows about the window, so the reset is ours.
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [pathname]);

  // Approved membership is what every club-scoped query waits on. Rather than
  // showing a wall of empty states, swap the whole thing for the way in — and
  // render it in place instead of redirecting, so the URL survives: approve the
  // member in another window and the page they wanted is one refresh away.
  if (!isMember)
    return (
      <>
        {accent}
        <ClubOnboardingPage />
      </>
    );

  // A pinned device shows one table and the match on it. No drawer, no tabs, no
  // app bar: every one of them is a way to end up somewhere this device has no
  // business being, and the page below carries its own name and its own way
  // back out. The cookie is a guardrail against a stray swipe, not a boundary —
  // see libs/kiosk.ts.
  if (kioskTable !== null)
    return (
      <>
        {accent}
        <div ref={kioskRef} className="flex h-dvh flex-col overflow-hidden bg-pocket">
          {/* The tablet's only chrome. The pages below render content and
              nothing else — a second header on a scoreboard is a second header
              on the one screen that wants the whole display. */}
          <KioskBar tableId={kioskTable} containerRef={kioskRef} />
          <main className="min-h-0 flex-1 overflow-hidden pb-[env(safe-area-inset-bottom)]">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </>
    );

  return (
    <>
      {accent}
      {/* Both nav forms, each hiding itself outside its own width. Nothing here
          asks how wide the window is: every one of these is a CSS breakpoint, so
          the HTML the server sends is already the right one and there is nothing
          for hydration to move. See --breakpoint-pinned. */}
      <NavDrawer pinned />
      <NavDrawer
        open={isDrawerOpen}
        closeOnLeave={byPointer}
        onClose={() => {
          setIsDrawerOpen(false);
          setByPointer(false);
        }}
      />

      {/* Nothing to see: a strip along the edge the nav lives behind, so on a
          desktop reaching for it is enough and the hamburger is only the
          keyboard's way in. Phones have the tab bar and never grow one; pinned
          the column is already there. */}
      <div
        aria-hidden
        onMouseEnter={() => {
          setIsDrawerOpen(true);
          setByPointer(true);
        }}
        className="fixed inset-y-0 left-0 z-30 hidden w-3 md:block pinned:hidden"
      />

      <div
        data-app-shell
        className="flex h-dvh flex-col overflow-hidden pinned:pl-[19rem]"
      >
        {!fullBleed && <NavRail onMore={() => setIsDrawerOpen(true)} />}
        {/* The pinned column carries the club, the bell and the user across its
            own ends, so a bar here would be a second row of chrome repeating it. */}
        <div className="shrink-0 pinned:hidden">
          <AppHeader onMenu={() => setIsDrawerOpen(true)} />
        </div>
        {/* Clear the bottom tab bar on phones, including the home-indicator inset.
            The pt is for the pinned case: with no bar above it, the page's own
            py-4 is all there is between the first heading and the window. */}
        <main
          ref={scroller}
          className={[
            "flex-1 pinned:pt-2",
            fullBleed
              ? // Nothing under here scrolls, and a page sized to the viewport
                // must not be able to produce a scrollbar of its own. The inset
                // still has to be cleared — with the tab bar gone, the home
                // indicator is what the bottom edge runs into.
                "overflow-hidden pb-[env(safe-area-inset-bottom)]"
              : "overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0",
          ].join(" ")}
        >
          {/* Pushed off a full-bleed page rather than pushing its content: the
              banner is an admin's standing to-do, and it is still on every
              other page in the club. */}
          {!fullBleed && <JoinRequestBanner />}
          {/* Install and notifications, one at a time — see AppPrompts. Same
              guard, same reason: a tablet on the rail has no player to ask and
              nowhere to show a notification. */}
          {!fullBleed && <AppPrompts />}
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </>
  );
}
