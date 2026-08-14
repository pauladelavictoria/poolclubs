import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { signOut } from "@/libs/auth.functions";
import { useSessionRefresh } from "./useAuth";

/**
 * Signing out, on the server: the cookies are cleared there, so there is nothing
 * left in the browser to clean up.
 *
 * It also navigates, which the old version did not — it relied on the auth
 * listener noticing and every guard re-rendering. Now the session is route
 * context, so the way to leave a page you can no longer see is to leave it.
 */
export const useSignOut = () => {
  const refreshSession = useSessionRefresh();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      await signOut();
      await refreshSession();
      await navigate({ to: "/" });
    },
  });
};
