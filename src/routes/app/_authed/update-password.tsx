import { createFileRoute } from "@tanstack/react-router";
import UpdatePasswordPage from "@/pages/app/UpdatePasswordPage";

/**
 * Where the recovery email lands, by way of /auth/callback.
 *
 * Under _authed on purpose and with no guard of its own: verifying a recovery
 * link signs the person in, so by the time they arrive the ordinary session
 * check is exactly the right gate. A stale or reused link never gets a session,
 * so it never gets here — it bounces off _authed to /app/login instead.
 */
export const Route = createFileRoute("/app/_authed/update-password")({
  component: UpdatePasswordPage,
});
