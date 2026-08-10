import { useAuth } from "@/hooks/useAuth";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/Skeleton";
import { loginLink } from "@/libs/nextPath";

export const ProtectedRoute = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-3 py-6">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-40 w-full rounded-card" />
      </div>
    );
  }

  return user ? (
    <Outlet />
  ) : (
    <Navigate to={loginLink(location.pathname + location.search)} replace />
  );
};
