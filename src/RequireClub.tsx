import { Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/Skeleton";
import ClubOnboardingPage from "@/pages/ClubOnboardingPage";

/**
 * Signed in is not enough — every club-scoped query returns nothing until you
 * are an approved member of somewhere. Rather than showing a wall of empty
 * states, swap the whole thing for the way in.
 *
 * Renders in place instead of redirecting so the URL survives: approve the
 * member in another window and the page they wanted is one refresh away.
 */
export const RequireClub = () => {
  const { isLoading, isPlayerLoading, isMember } = useAuth();

  if (isLoading || isPlayerLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-3 py-6">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-40 w-full rounded-card" />
      </div>
    );
  }

  return isMember ? <Outlet /> : <ClubOnboardingPage />;
};
