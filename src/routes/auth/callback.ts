import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseServer } from "@/libs/supabase.server";
import { isSafePath } from "@/libs/nextPath";

/**
 * Where Google and the email-confirmation links come back to.
 *
 * A server route rather than a page: the only thing that happens here is
 * exchanging the one-time code for a session, which sets the cookies, and then
 * a redirect. Nothing renders, so there is no flash of an app that doesn't yet
 * know who you are.
 *
 * The PKCE verifier was written to a cookie when the trip started (see
 * startGoogleOAuth in libs/auth.functions.ts), which is why the exchange can
 * happen here at all.
 */
export const Route = createFileRoute("/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const next = url.searchParams.get("next");

        // Attacker-controlled, so anything that could leave the site is
        // refused and we fall back to the app's front door.
        const destination = isSafePath(next) ? next : "/app";

        if (!code) {
          // No code means the provider refused, or somebody typed the URL.
          // Send them back to sign in rather than to a half-open session.
          return redirectTo("/app/login");
        }

        const supabase = getSupabaseServer();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        return redirectTo(error ? "/app/login" : destination);
      },
    },
  },
});

/**
 * A plain 303 rather than the router's `redirect()`: the cookies Supabase just
 * set are on this response, and throwing here would build a different one.
 * 303 because the browser must follow it with a GET.
 */
const redirectTo = (location: string) =>
  new Response(null, { status: 303, headers: { location } });
