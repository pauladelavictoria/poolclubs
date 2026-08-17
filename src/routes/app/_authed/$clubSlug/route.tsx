import { Suspense, useEffect, useRef, useState } from "react";
import {
  Outlet,
  createFileRoute,
  notFound,
  useLocation,
} from "@tanstack/react-router";
import AppHeader from "@/components/layout/AppHeader";
import JoinRequestBanner from "@/components/layout/JoinRequestBanner";
import NavDrawer from "@/components/layout/NavDrawer";
import NavRail from "@/components/layout/NavRail";
import { PageSkeleton } from "@/components/ui/Skeleton";
import ClubOnboardingPage from "@/pages/app/ClubOnboardingPage";
import ClubThemeStyle from "@/components/club/ClubThemeStyle";
import { playersQuery } from "@/queries/players";

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
  beforeLoad: ({ context, params }) => {
    const membership = context.memberships.find(
      (m) => m.club?.slug === params.clubSlug,
    );

    // A club you are not in reads the same as a club that does not exist.
    if (!membership?.club) throw notFound();

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
        <NavRail onMore={() => setIsDrawerOpen(true)} />
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
          className="flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0 pinned:pt-2"
        >
          <JoinRequestBanner />
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </>
  );
}
