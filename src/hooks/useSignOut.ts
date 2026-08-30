import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { signOut } from "@/libs/server/auth.functions";
import { useT } from "@/i18n";
import { useSessionRefresh } from "./useAuth";

/**
 * Signing out, on the server: the cookies are cleared there, so there is nothing
 * left in the browser to clean up.
 *
 * It also navigates, which the old version did not — it relied on the auth
 * listener noticing and every guard re-rendering. Now the session is route
 * context, so the way to leave a page you can no longer see is to leave it.
 *
 * The toast is here rather than at the call sites: there are two of them now (the
 * bar's avatar menu and the pinned column's footer) and what the user is told
 * about signing out is not something either of them should get to disagree about.
 */
export const useSignOut = () => {
  const refreshSession = useSessionRefresh();
  const navigate = useNavigate();
  const { t } = useT();

  return useMutation({
    mutationFn: async () => {
      await signOut();
      await refreshSession();
      await navigate({ to: "/" });
    },
    onSuccess: () => toast.success(t("auth.signedOut")),
    // Logged by the mutation cache; this is the part the user sees.
    onError: () => toast.error(t("auth.signOutError")),
  });
};
