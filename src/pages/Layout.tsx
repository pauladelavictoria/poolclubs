import { Suspense, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import NavRail from "@/components/NavRail";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { NEXT_KEY, isSafePath } from "@/libs/nextPath";

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();

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
        <Suspense
          fallback={
            <div className="mx-auto max-w-3xl space-y-3 px-3 py-6">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-40 w-full rounded-card" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
