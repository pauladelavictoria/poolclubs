import { CONTACT_EMAIL } from "../../content/legal";

/**
 * The Resend transport, split out of mail.functions.ts so
 * netlify/functions/youtube-reconcile.mts can send the game-recording mail
 * (§2.5) without going through a createServerFn — createServerFn's RPC
 * wrapping is a TanStack Start build-time transform, and the reconciler is
 * bundled by Netlify's own esbuild step, outside Start's Vite plugin, so
 * there's no guarantee that transform ever runs over this file. A plain
 * function has no such dependency either way.
 *
 * The import above is relative rather than the `@/` alias for the same
 * reason — the alias only resolves under Vite, and this file has to import
 * cleanly from Netlify's standalone bundle too.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Must be a domain verified in Resend, or every send fails with a 403. */
export const MAIL_FROM = `PoolClubs <${CONTACT_EMAIL}>`;

/** One POST with a bearer token. fetch, not the resend SDK: a dependency for
 *  this would be a dependency to keep up to date. */
export async function sendMail(
  apiKey: string,
  to: string,
  say: (reason: string) => null,
  body: { subject: string; html: string; text: string },
  replyTo?: string,
) {
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: MAIL_FROM,
      to: [to],
      subject: body.subject,
      html: body.html,
      text: body.text,
      ...(replyTo ? { reply_to: [replyTo] } : {}),
    }),
  });

  if (!response.ok) {
    // Read the body: Resend puts the actual reason in it, and a bare 403 in
    // the deploy log is indistinguishable from a wrong key, an unverified
    // domain and a rate limit.
    const detail = await response.text().catch(() => "");
    return say(`resend ${response.status}: ${detail.slice(0, 300)}`);
  }

  return say("sent");
}

/**
 * One line to the deploy logs, returning null so every bail-out above can be
 * written as `return say(...)`.
 *
 * Never thrown and never sent to the client, exactly as in push.functions.ts:
 * the write already succeeded before this ran, and a member who is in the club
 * but did not get an email is in the club. Logging the success case too,
 * because otherwise "sent" and "silently did nothing" look identical from
 * outside — which is the one thing that made the first push failure in
 * production impossible to diagnose.
 *
 * The address is deliberately not logged.
 */
export function logger(subject: string) {
  return (reason: string): null => {
    console.log(`[mail] ${subject}: ${reason}`);
    return null;
  };
}
