import { Suspense, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import NavRail from "@/components/NavRail";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { NEXT_KEY, isSafePath } from "@/libs/nextPath";
import { useClubTheme } from "@/libs/clubTheme";

export default function Layout() {
  const { user, activeClub } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-dvh md:pl-[72px]">
      <NavRail />
      {/* Clear the bottom tab bar on phones, including the home-indicator inset */}
      <div className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
