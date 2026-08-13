import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import NavDrawer from "@/components/NavDrawer";
import NavRail from "@/components/NavRail";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { NEXT_KEY, isSafePath } from "@/libs/nextPath";
import { useClubTheme } from "@/libs/clubTheme";
import { useMedia } from "@/libs/useMedia";

/**
 * The nav column is 19rem and the content is 64rem wide at most; below the two
 * of them plus their gutters the drawer would be taking room off the pages it
 * leads to, so it goes back to being something you open.
 */
const PINNED = "(min-width: 1360px)";

export default function Layout() {
  const { user, activeClub } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const scroller = useRef<HTMLElement>(null);
  const pinned = useMedia(PINNED);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // A drawer the pointer opened is one the pointer should be able to put away;
  // one opened from a button stays until it is dismissed.
  const [byPointer, setByPointer] = useState(false);

  // Every page under /app shares one active club, so its accent is set here
  // rather than in each page that happens to render something coloured.
  useClubTheme(activeClub);

  // Google drops everyone back on the site root. If they were on their way
  // somewhere before signing in, finish the trip.
  useEffect(() => {
    if (!user) return;
    const next = sessionStorage.getItem(NEXT_KEY);
    if (!next) return;
    sessionStorage.removeItem(NEXT_KEY);
    if (isSafePath(next)) navigate(next, { replace: true });
  }, [user, navigate]);

  // The page scrolls, the chrome does not — so the scrollbar lives inside the
  // content and taking or freeing it can't move the bar or the tabs. Router
  // scroll restoration only knows about the window, so the reset is ours.
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <NavDrawer
        pinned={pinned}
        open={isDrawerOpen}
        closeOnLeave={byPointer}
        onClose={() => {
          setIsDrawerOpen(false);
          setByPointer(false);
        }}
      />

      {/* Nothing to see: a strip along the edge the nav lives behind, so on a
          desktop reaching for it is enough and the hamburger is only the
          keyboard's way in. Phones have the tab bar and never grow one. */}
      {!pinned && (
        <div
          aria-hidden
          onMouseEnter={() => {
            setIsDrawerOpen(true);
            setByPointer(true);
          }}
          className="fixed inset-y-0 left-0 z-30 hidden w-3 md:block"
        />
      )}

      <div
        data-app-shell
        className={`flex h-dvh flex-col overflow-hidden ${
          pinned ? "pl-[19rem]" : ""
        }`}
      >
        <NavRail onMore={() => setIsDrawerOpen(true)} />
        <AppHeader onMenu={pinned ? undefined : () => setIsDrawerOpen(true)} />
        {/* Clear the bottom tab bar on phones, including the home-indicator inset */}
        <main
          ref={scroller}
          className="flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0"
        >
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </>
  );
}
