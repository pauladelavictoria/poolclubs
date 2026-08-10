import { useAuth } from "@/hooks/useAuth";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { loginLink } from "@/libs/nextPath";

export const ProtectedRoute = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageSkeleton />;

  return user ? (
    <Outlet />
  ) : (
    <Navigate to={loginLink(location.pathname + location.search)} replace />
  );
};
