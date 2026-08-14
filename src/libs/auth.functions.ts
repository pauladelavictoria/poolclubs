import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSupabaseServer } from "./supabase.server";
import { isSafePath } from "./nextPath";
import type { Membership } from "@/types";

/**
 * Signing in, out and up, on the server.
 *
 * These are the only places the app talks to Supabase auth. The handler bodies
 * run server-side and set the session cookies as a side effect, so by the time
 * one of them resolves the browser is signed in — there is no token for client
 * code to hold, mishandle or leak.
 *
 * Every input is validated: a server function is a public HTTP endpoint whatever
 * it looks like from the call site.
 */

/** What the whole app knows about who is looking at it. */
export type Session = {
  user: { id: string; email: string | null; fullName: string | null };
  /** Every club the user belongs to, pending ones included. */
  memberships: Membership[];
};

/** Providers disagree on the field name; Google sends both, GitHub only one. */
const avatarOf = (metadata: Record<string, unknown> | undefined) =>
  (metadata?.avatar_url as string | undefined) ||
  (metadata?.picture as string | undefined) ||
  undefined;

/**
 * The session, plus the memberships that decide which clubs the user can reach.
 *
 * getUser() rather than getSession(): it validates the token against Supabase
 * instead of trusting whatever the cookie says, which is the difference between
 * a check and a formality.
 */
export const getSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<Session | null> => {
    const supabase = getSupabaseServer();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return null;

    const { data: rows } = await supabase
      .from("players")
      .select("*, club:clubs(*)")
      .eq("user_id", user.id);

    const memberships = (rows ?? []) as unknown as Membership[];
    const avatarUrl = avatarOf(user.user_metadata);

    // Only the owner can read their own auth metadata, so the OAuth picture is
    // copied onto the player rows — otherwise every other member sees an
    // initial. An uploaded avatar is a data: URI and a deliberate choice, so it
    // is left alone; otherwise the next sign-in would quietly put Google's face
    // back.
    const stale = memberships.filter(
      (m) => m.avatar_url !== avatarUrl && !m.avatar_url?.startsWith("data:"),
    );
    if (avatarUrl && stale.length) {
      await supabase
        .from("players")
        .update({ avatar_url: avatarUrl })
        .in(
          "id",
          stale.map((m) => m.id),
        );
      stale.forEach((m) => (m.avatar_url = avatarUrl));
    }

    return {
      user: {
        id: user.id,
        email: user.email ?? null,
        fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
      },
      memberships,
    };
  },
);

/**
 * Failures come back as a code, never as Supabase's own message.
 *
 * "Invalid login credentials" is English-only and, worse, "wrong password"
 * tells a stranger the account exists. The component maps these onto the
 * existing translated, deliberately vague strings.
 */
export type AuthFailure = { error: "badCredentials" | "signUpError" };

const credentials = z.object({
  email: z.string().email().max(320),
  password: z.string().min(6).max(200),
});

export const signIn = createServerFn({ method: "POST" })
  .validator(credentials)
  .handler(async ({ data }): Promise<AuthFailure | null> => {
    const supabase = getSupabaseServer();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    return error ? { error: "badCredentials" } : null;
  });

export const signUp = createServerFn({ method: "POST" })
  .validator(
    credentials.extend({
      // Names are unique per club; this is how two real people sharing one
      // disambiguate. Same key Google fills, so join_club() and the profile
      // menu read one field regardless of how the account was made.
      fullName: z.string().trim().min(1).max(60),
      next: z.string().optional(),
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<AuthFailure | { needsConfirmation: boolean }> => {
      const supabase = getSupabaseServer();
      const { data: result, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: callbackUrl(data.next),
          data: { full_name: data.fullName },
        },
      });
      if (error) return { error: "signUpError" };
      // Sign-up with email confirmation on returns a user but no session.
      return { needsConfirmation: !result.session };
    },
  );

/**
 * Google sends the browser away and back, so the trip is started here to keep
 * the PKCE verifier in a server cookie: `skipBrowserRedirect` hands back the
 * URL instead of following it, and the caller navigates.
 */
export const startGoogleOAuth = createServerFn({ method: "POST" })
  .validator(z.object({ next: z.string().optional() }))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    const { data: result, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { skipBrowserRedirect: true, redirectTo: callbackUrl(data.next) },
    });
    if (error || !result.url) return { error: "badCredentials" as const };
    return { url: result.url };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = getSupabaseServer();
  await supabase.auth.signOut();
  return null;
});

/**
 * Where a provider or a confirmation email sends the browser back to.
 *
 * The post-login destination rides in this URL rather than in sessionStorage,
 * which is what the old flow used to survive the round trip — it had to be
 * written by the login page and read back by the layout. `next` is
 * attacker-controlled, so it goes through the same same-site check as every
 * other redirect target.
 */
function callbackUrl(next?: string) {
  const url = new URL("/auth/callback", getRequestUrl());
  if (isSafePath(next)) url.searchParams.set("next", next);
  return url.toString();
}
