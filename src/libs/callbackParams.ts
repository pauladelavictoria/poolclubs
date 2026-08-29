/**
 * Reading /auth/callback's query string.
 *
 * Two entirely different things come back to that one URL. Google returns a
 * PKCE `code`, which is only redeemable in the browser that started the trip —
 * the verifier sits in a cookie there. An email link returns a `token_hash`,
 * which is redeemable anywhere, and that is the point: a confirmation link
 * opened on a phone after signing up on a laptop has no verifier to offer.
 *
 * Split out of the route handler so it can be asserted without a server. See
 * callbackParams.check.ts.
 */

/**
 * The link types we send, and the only values ever handed to verifyOtp.
 *
 * `type` comes off a URL a stranger can write, so it is checked against this
 * list rather than passed through. `signup` and `magiclink` are missing on
 * purpose: @supabase/auth-js documents them as deprecated aliases of `email`,
 * and our confirmation template sends `email`.
 *
 * ponytail: email_change is accepted but the flow behind it is unbuilt — with
 * double_confirm_changes on, Supabase mails both the old and new address and
 * the change lands only once both are used, while this treats one success as
 * done. Unreachable until something calls updateUser({ email }); handle the
 * two-step then.
 */
const OTP_TYPES = ["email", "recovery", "email_change"] as const;

type OtpType = (typeof OTP_TYPES)[number];

export const isOtpType = (value: string | null | undefined): value is OtpType =>
  !!value && (OTP_TYPES as readonly string[]).includes(value);

/** Which of the two exchanges this request is asking for, if either. */
type Branch =
  | { kind: "hash"; tokenHash: string; type: OtpType }
  | { kind: "code"; code: string }
  | { kind: "none" };

/**
 * The hash is checked first: an email link is the case that has to work from a
 * device that has never seen this site, so it wins if both somehow appear.
 * A token_hash with a type we don't send is not a code request — it is a
 * malformed one, and falls through to `none` rather than quietly trying PKCE.
 */
export function pickBranch(url: URL): Branch {
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (tokenHash && isOtpType(type)) return { kind: "hash", tokenHash, type };
  if (tokenHash) return { kind: "none" };

  const code = url.searchParams.get("code");
  if (code) return { kind: "code", code };

  return { kind: "none" };
}
