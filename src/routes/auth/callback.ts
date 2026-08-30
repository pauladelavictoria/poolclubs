import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseServer } from "@/libs/supabase/server";
import { isSafePath, loginFailedLink } from "@/libs/algorithms/nextPath";
import { pickBranch } from "@/libs/algorithms/callbackParams";

/**
 * Where Google and the confirmation emails come back to.
 *
 * A server route rather than a page: the only thing that happens here is
 * turning a one-time credential into a session, which sets the cookies, and
 * then a redirect. Nothing renders, so there is no flash of an app that doesn't
 * yet know who you are.
 *
 * Two ways in, and they are not interchangeable:
 *
 *  - token_hash, from an email. Verified straight against Supabase with nothing
 *    from this browser involved. That is the point — a confirmation link is
 *    opened in whatever mail client the person uses, which is routinely not the
 *    browser that signed up.
 *
 *  - code, from Google. PKCE, and the verifier was written to a cookie when the
 *    trip started (startGoogleOAuth in libs/server/auth.functions.ts) — same browser,
 *    same visit, so it is there.
 *
 * The email branch is the newer one. Before it, every confirmation went through
 * the PKCE exchange and failed whenever the link was opened somewhere else,
 * which is most of the time.
 */
export const Route = createFileRoute("/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);

        // Attacker-controlled, so anything that could leave the site is refused
        // and we fall back to the app's front door.
        const next = url.searchParams.get("next");
        const destination = isSafePath(next) ? next : "/app";

        const branch = pickBranch(url);
        const supabase = getSupabaseServer();

        // Logged, never shown. "Token has expired or is invalid" is
        // English-only, and the screen says as much in three languages without
        // naming Supabase.
        if (branch.kind === "hash") {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: branch.tokenHash,
            type: branch.type,
          });
          if (error) console.error("auth callback: verifyOtp", error.message);
          return redirectTo(error ? loginFailedLink(destination) : destination);
        }

        if (branch.kind === "code") {
          const { error } = await supabase.auth.exchangeCodeForSession(
            branch.code,
          );
          if (error) console.error("auth callback: exchange", error.message);
          return redirectTo(error ? loginFailedLink(destination) : destination);
        }

        // Nothing to redeem: the provider refused, a mail client mangled the
        // link, or somebody typed the URL. Say so rather than bouncing in
        // silence — the silent bounce is what made an expired link look like
        // the account had never been created.
        console.error("auth callback: no credential on the URL");
        return redirectTo(loginFailedLink(destination));
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
