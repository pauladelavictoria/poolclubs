import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import LoginPage from "@/pages/LoginPage";
import { isSafePath } from "@/libs/nextPath";

/**
 * Stays at /app/login rather than moving to /login, even though it has nothing
 * to do with a club: public/site.webmanifest pins the PWA's scope to /app, and a
 * sign-in page outside that scope would open in the browser instead of the
 * installed app.
 */
export const Route = createFileRoute("/app/login")({
  validateSearch: z.object({
    // Where to go afterwards. Checked again in the component and again on the
    // server before it is used — it comes off the URL, so it is never trusted.
    next: z.string().optional(),
  }),

  beforeLoad: ({ context, search }) => {
    // Already signed in: nothing to do here but leave.
    if (context.session) {
      throw redirect({
        href: isSafePath(search.next) ? search.next : "/app",
      });
    }
  },

  component: LoginPage,
});
