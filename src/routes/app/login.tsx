import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import LoginPage from "@/pages/app/LoginPage";
import { isSafePath } from "@/libs/algorithms/nextPath";

/**
 * Stays at /app/login rather than moving to /login, even though it has nothing
 * to do with a club: both manifests pin the PWA's scope to /app — site.webmanifest
 * and the per-club one in $clubSlug.manifest[.]webmanifest.ts — and a sign-in page
 * outside that scope opens in the browser instead of the installed app. The club
 * manifest used to scope itself to /app/<slug>, which broke exactly that: the
 * guard above sends every session-less launch here, and here was out of scope.
 */
export const Route = createFileRoute("/app/login")({
  validateSearch: z.object({
    // Where to go afterwards. Checked again in the component and again on the
    // server before it is used — it comes off the URL, so it is never trusted.
    next: z.string().optional(),
    // Set by /auth/callback when a confirmation or recovery link didn't work.
    // `.catch` rather than a hard parse: this is on a URL a stranger can type,
    // and junk should be ignored rather than turned into an error screen on the
    // one page whose job is recovering from errors.
    error: z.literal("link").optional().catch(undefined),
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
