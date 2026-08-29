import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSupabaseServer } from "./supabase.server";
import { isSafePath } from "./nextPath";
import { flattenPlayer } from "@/queries/players";
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
  user: {
    id: string;
    email: string | null;
    fullName: string | null;
    /**
     * Whether this account has an email/password identity at all.
     *
     * False for someone who only ever pressed "Continue with Google", and for
     * the anonymous user behind a paired tablet. Settings needs it because
     * `updateUser({ password })` does not fail on an OAuth-only account — it
     * quietly *adds* a password identity, so an unguarded "change password"
     * field turns one way in into two without ever saying so.
     */
    hasPassword: boolean;
  };
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

    // person!inner: the memberships are reached through the person now, since
    // that is where user_id lives. The join being inner is what keeps this from
    // returning every player row in the database when the user has no person
    // yet — a filter on an embedded column is not on its own a filter on the
    // parent.
    const { data: rows } = await supabase
      .from("players")
      .select("*, person:people!inner(*), club:clubs(*)")
      .eq("person.user_id", user.id);

    // flattenPlayer keeps every field it does not recognise, so `club` rides
    // through untouched — a Membership is a Player with a club on it.
    const memberships = (rows ?? []).map(
      (row) => flattenPlayer(row) as unknown as Membership,
    );

    const avatarUrl = avatarOf(user.user_metadata);

    // Only the owner can read their own auth metadata, so the OAuth picture is
    // copied onto the person — otherwise every other member sees an initial. An
    // uploaded avatar is a data: URI and a deliberate choice, so it is left
    // alone; otherwise the next sign-in would quietly put Google's face back.
    //
    // One row, not one per club: that is the whole point of people existing. The
    // memberships all carry the same flattened copy, so they are patched in
    // memory rather than re-fetched.
    const current = memberships[0];
    if (
      avatarUrl &&
      current &&
      current.avatar_url !== avatarUrl &&
      !current.avatar_url?.startsWith("data:")
    ) {
      await supabase
        .from("people")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", user.id);
      memberships.forEach((m) => (m.avatar_url = avatarUrl));
    }

    // `identities` is the authoritative list of ways into this account —
    // app_metadata.providers is a denormalised copy of it, kept only as the
    // fallback for a token that arrived without identities attached.
    const providers =
      user.identities?.map((i) => i.provider) ??
      (user.app_metadata?.providers as string[] | undefined) ??
      [];

    return {
      user: {
        id: user.id,
        email: user.email ?? null,
        fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
        hasPassword: providers.includes("email"),
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
export type AuthFailure = {
  error: "badCredentials" | "signUpError" | "passwordChangeError";
};

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

/**
 * Pairing the tablet on the rail.
 *
 * Anonymous sign-in, then redeem the owner's code. Anonymous because the device
 * must not carry anybody's credentials — a tablet left on a bar is signed in to
 * whatever it holds, and this way what it holds is a member of the club that
 * exists only to keep score.
 *
 * Both halves are here rather than in the browser so the session lands in the
 * same httpOnly cookies every other sign-in uses, and so the server is what
 * decides whether the code was good.
 *
 * Requires anonymous sign-ins to be enabled for the Supabase project. They are
 * a project setting, not a migration, so `anonymousDisabled` is a real answer
 * and the screen says so rather than showing "something went wrong".
 */
export type PairFailure = {
  error: "badCode" | "alreadyPaired" | "anonymousDisabled" | "pairError";
};

export const pairDevice = createServerFn({ method: "POST" })
  .validator(
    z.object({
      code: z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9]{6}$/),
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<PairFailure | { clubSlug: string; tableId: number }> => {
    const supabase = getSupabaseServer();

    const { error: signInError } = await supabase.auth.signInAnonymously();
    if (signInError) {
      // Logged, because the two ways this fails look identical from the tablet
      // and only one of them is fixable from the app.
      console.error("pairDevice: anonymous sign-in failed", signInError.message);
      return {
        error: /anonymous/i.test(signInError.message)
          ? "anonymousDisabled"
          : "pairError",
      };
    }

    // A set-returning function, so one row: the club to open and the table this
    // code was cut for.
    //
    // claim_device changed shape in sql/device-pairing.sql and the generated
    // types still carry the old one. Narrow cast until that migration is
    // applied and `npm run db:types` re-run — the same stand-in
    // queries/operator.ts uses.
    const rpc = supabase as unknown as {
      rpc: (
        fn: string,
        args: Record<string, string>,
      ) => PromiseLike<{
        data: { club_slug: string; table_id: number }[] | null;
        error: { message: string } | null;
      }>;
    };

    const { data: rows, error } = await rpc.rpc("claim_device", {
      p_code: data.code.toUpperCase(),
    });

    const claim = rows?.[0];
    if (error || !claim) {
      console.error("pairDevice: claim failed", error?.message);
      // The anonymous user is left behind rather than cleaned up: deleting it
      // needs the service role, which this app deliberately does not have, and
      // an unpaired anonymous user can read nothing.
      await supabase.auth.signOut();

      // A tablet that has been paired before fails here for a completely
      // different reason than a stale code, and telling somebody to get a new
      // code when the code was fine is the kind of dead end that ends with the
      // tablet in a drawer.
      return {
        error: /already paired/i.test(error?.message ?? "")
          ? "alreadyPaired"
          : "badCode",
      };
    }

    return { clubSlug: claim.club_slug, tableId: claim.table_id };
  },
);

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
      // Logged because the screen deliberately says nothing useful: SMTP being
      // misconfigured and an address already taken look identical from the form.
      if (error) {
        console.error("signUp failed", error.message);
        return { error: "signUpError" };
      }
      // Sign-up with email confirmation on returns a user but no session.
      return { needsConfirmation: !result.session };
    },
  );

/**
 * Forgotting a password, and then setting a new one.
 *
 * The request half never reports anything. Whether the address has an account
 * is exactly what a stranger typing addresses into this form wants to learn, so
 * the answer is the same either way and the real failure is logged instead.
 *
 * The recovery link lands on /auth/callback like every other email link, which
 * verifies it and *signs the person in*; /app/update-password is behind the
 * normal _authed guard from there. The window is the OTP expiry, same as the
 * confirmation link.
 */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email().max(320) }))
  .handler(async ({ data }): Promise<null> => {
    const supabase = getSupabaseServer();
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: callbackUrl("/app/update-password"),
    });
    if (error) console.error("requestPasswordReset failed", error.message);
    return null;
  });

export const changePassword = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string().min(6).max(200) }))
  .handler(async ({ data }): Promise<AuthFailure | null> => {
    const supabase = getSupabaseServer();
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });
    if (error) {
      console.error("changePassword failed", error.message);
      return { error: "passwordChangeError" };
    }
    return null;
  });

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
  // Set unconditionally, even to the default. The confirmation template appends
  // "&token_hash=…" to {{ .RedirectTo }}, and a RedirectTo with no query string
  // of its own would swallow that "&" into the path — a dead link, in the most
  // common case of all: signing up from the plain login page with no `next`.
  url.searchParams.set("next", isSafePath(next) ? next : "/app");
  return url.toString();
}
