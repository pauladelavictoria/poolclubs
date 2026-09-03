import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, getRouteApi } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { startRealtime } from "@/libs/browser/realtime";
import AppHeader from "@/components/layout/AppHeader";
import JoinRequestBanner from "@/components/layout/JoinRequestBanner";
import LobbyBanner from "@/components/layout/LobbyBanner";
import AppPrompts from "@/components/layout/AppPrompts";
import NavDrawer from "@/components/layout/NavDrawer";
import NavRail from "@/components/layout/NavRail";
import { PageSkeleton } from "@/components/ui/Skeleton";
import ClubOnboardingPage from "@/pages/app/ClubOnboardingPage";
import ClubThemeStyle from "@/components/club/ClubThemeStyle";
import { useRouteMeta } from "@/libs/routeMeta";
import { useAuth, useSessionRefresh } from "@/hooks/useAuth";
import { readKioskTable } from "@/libs/browser/kiosk";
import KioskBar from "@/components/layout/KioskBar";

const route = getRouteApi("/app/_authed/$clubSlug");

/**
 * A club, and everything inside it — the app's chrome, mounted by
 * routes/app/_authed/$clubSlug/route.tsx once beforeLoad has resolved the
 * membership. It used to be one level up, on /app, but every link in the
 * rail and the drawer now needs to know which club it is pointing at.
 */
export default function ClubLayout() {
  const { activeClub, activeClubId, isMember } = route.useRouteContext();
  const { player } = useAuth();
  const queryClient = useQueryClient();
  const refreshSession = useSessionRefresh();

  // The app's one realtime channel, opened here rather than at the root because
  // this is the highest place that knows which club to ask for — see
  // libs/browser/realtime.ts. Switching club is a navigation, so this component stays
  // mounted and the effect re-runs with the new id.
  useEffect(() => {
    startRealtime({
      queryClient,
      clubId: activeClubId,
      playerId: player.id,
      refreshSession,
    });
  }, [queryClient, activeClubId, player.id, refreshSession]);

  // A page that is the whole screen — the live scoreboard — keeps neither the
  // tab bar nor the room reserved for it. See RouteMeta.fullBleed.
  const { fullBleed, bareOnDevice } = useRouteMeta();
  // The club's own tablet, on a page that says it wants the display to itself.
  // Not the same thing as a pinned kiosk, which is answered above and has its
  // own bar: this is the tablet that was simply signed in as the club.
  const bare = bareOnDevice && player?.is_device === true;
  const kioskTable = readKioskTable();
  // A tablet on a rail wants the browser's chrome gone as much as the app's.
  // Element fullscreen, so it is the shell that fills the screen and not the
  // document — the same mechanism the wall display and the scoreboard use.
  // The shell fullscreen acts on. The bar owns the button; the ref has to be
  // here, because this is what renders the element.
  const kioskRef = useRef<HTMLDivElement>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // A drawer the pointer opened is one the pointer should be able to put away;
  // one opened from a button stays until it is dismissed.
  const [byPointer, setByPointer] = useState(false);

  // Every page under a club shares its accent, so it is set here rather than in
  // each page that happens to render something coloured.
  const accent = <ClubThemeStyle color={activeClub?.theme_color} />;

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
  // see libs/browser/kiosk.ts.
  if (kioskTable !== null)
    return (
      <>
        {accent}
        <div
          ref={kioskRef}
          className="relative flex h-dvh flex-col overflow-hidden bg-pocket"
        >
          {/* The tablet's only chrome. The pages below render content and
              nothing else — a second header on a scoreboard is a second header
              on the one screen that wants the whole display. On the pages that
              say they want the display to themselves it is laid over the page
              rather than stacked above it, for the same reason. */}
          <KioskBar
            tableId={kioskTable}
            containerRef={kioskRef}
            floating={bareOnDevice}
          />
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
        {!bare && (
          <div className="shrink-0 pinned:hidden">
            <AppHeader onMenu={() => setIsDrawerOpen(true)} />
          </div>
        )}
        {/* Clear the bottom tab bar wherever it renders — every width below
            --breakpoint-pinned — including the home-indicator inset.
            The pt is for the pinned case: with no bar above it, the page's own
            py-4 is all there is between the first heading and the window. */}
        <main
          data-scroll-restoration-id="app-shell"
          className={[
            "flex-1 pinned:pt-2",
            fullBleed
              ? // Nothing under here scrolls, and a page sized to the viewport
                // must not be able to produce a scrollbar of its own. The inset
                // still has to be cleared — with the tab bar gone, the home
                // indicator is what the bottom edge runs into.
                "overflow-hidden pb-[env(safe-area-inset-bottom)]"
              : "overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] pinned:pb-0",
          ].join(" ")}
        >
          {/* Pushed off a full-bleed page rather than pushing its content: the
              banner is an admin's standing to-do, and it is still on every
              other page in the club. */}
          {!fullBleed && <LobbyBanner />}
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
