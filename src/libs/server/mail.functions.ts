import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServer } from "@/libs/supabase/server";
import {
  MAIL_FROM,
  MAIL_OPS,
  clubClaimMail,
  joinRequestMail,
  memberApprovedMail,
} from "@/libs/algorithms/mailText";

/**
 * The two sides of joining a club, by email: telling an admin somebody is
 * waiting, and telling that somebody they are in.
 *
 * Built to the same shape as sendPush (src/libs/server/push.functions.ts) and
 * for the same reasons — read that file's header first; everything it says
 * about being fired from the client after the write, rather than from a
 * database trigger, applies here unchanged.
 *
 * Where it differs is why email and not a push: neither party can be reached
 * any other way at this moment. Somebody waiting to be approved has almost
 * certainly never opened the installed app, so has no push subscription and no
 * bell to check; and an admin whose club is quiet is precisely the admin who is
 * not looking at it. The address each signed up with is the only channel, and
 * these are the only moments it is legitimate to use.
 *
 * Authorisation is in neither handler. It is approved_member_contact and
 * join_request_admin_contact, SECURITY DEFINER functions that decide whether
 * the caller may know an address at all and return nothing if not — see
 * sql/schema.sql. Either handler could be called with any id by any signed-in
 * person and would still only ever send about a membership that caller just
 * legitimately changed.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const approvedInput = z.object({ playerId: z.number().int().positive() });

export const sendMemberApprovedMail = createServerFn({ method: "POST" })
  .validator(approvedInput)
  .handler(async ({ data }): Promise<null> => {
    const say = logger(`memberApproved#${data.playerId}`);

    const apiKey = process.env.RESEND_API_KEY;
    // Same bargain as the VAPID keys: without the credential the feature turns
    // itself off rather than failing, so a checkout with no secrets still runs
    // and CI does not send mail.
    if (!apiKey) return say("no RESEND_API_KEY in this build");

    const supabase = getSupabaseServer();
    const { data: rows, error } = await supabase.rpc(
      "approved_member_contact",
      { p_player_id: data.playerId },
    );
    if (error) return say(`contact lookup failed: ${error.message}`);

    // The function returning nothing is the ordinary "no" — not an admin, not
    // approved yet, a roster row nobody has ever signed into. None of those is
    // an error worth a stack trace.
    const contact = rows?.[0];
    if (!contact?.email) return say("no address, or not allowed to know");

    return send(
      apiKey,
      contact.email,
      say,
      memberApprovedMail({
        name: contact.name,
        clubName: contact.club_name,
        clubSlug: contact.club_slug,
      }),
    );
  });

const requestInput = z.object({ clubId: z.number().int().positive() });

/**
 * Fired by whoever just asked to join, which is why the club id is all it
 * takes: join_request_admin_contact reads auth.uid() itself and answers only
 * while that caller's own row in that club is still pending. So a join into the
 * global club (which lands active, never pending — see join_club in
 * sql/schema.sql) sends nothing, and neither does a second call after approval.
 */
export const sendJoinRequestMail = createServerFn({ method: "POST" })
  .validator(requestInput)
  .handler(async ({ data }): Promise<null> => {
    const say = logger(`joinRequest@${data.clubId}`);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return say("no RESEND_API_KEY in this build");

    const supabase = getSupabaseServer();
    const { data: rows, error } = await supabase.rpc(
      "join_request_admin_contact",
      { p_club_id: data.clubId },
    );
    if (error) return say(`contact lookup failed: ${error.message}`);

    const contact = rows?.[0];
    if (!contact?.email) return say("nothing pending, or no admin address");

    return send(
      apiKey,
      contact.email,
      say,
      joinRequestMail({
        name: contact.name,
        clubName: contact.club_name,
        clubSlug: contact.club_slug,
      }),
    );
  });

const claimInput = z.object({ slug: z.string().min(1) });

/**
 * "This club is mine." Sent to us rather than to a member, because the clubs in
 * the imported directory belong to admin@poolclubs.app and handing one over is
 * a hand operation — see the header of sql/clubs-seed-es.sql.
 *
 * The slug is all it takes, again: club_claim_contact answers only for a club
 * still owned by that account, and the address it returns is auth.uid()'s own,
 * so the claim can never be filed under somebody else's name. A signed-out
 * caller gets a row with no email and this sends nothing — the page sends them
 * to sign up first, and this is the second lock on that door.
 */
export const sendClubClaimMail = createServerFn({ method: "POST" })
  .validator(claimInput)
  .handler(async ({ data }): Promise<null> => {
    const say = logger(`clubClaim@${data.slug}`);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return say("no RESEND_API_KEY in this build");

    const supabase = getSupabaseServer();
    const { data: rows, error } = await supabase.rpc("club_claim_contact", {
      p_slug: data.slug,
    });
    if (error) return say(`contact lookup failed: ${error.message}`);

    const contact = rows?.[0];
    // No such club, already claimed, or nobody signed in to claim it.
    if (!contact?.email) return say("not claimable, or not signed in");

    return send(
      apiKey,
      MAIL_OPS,
      say,
      clubClaimMail({
        name: contact.name ?? contact.email,
        email: contact.email,
        clubName: contact.club_name,
        clubSlug: contact.club_slug,
      }),
      // So that replying to it lands on the person claiming the club, which is
      // the next thing that has to happen.
      contact.email,
    );
  });

/** One POST with a bearer token. fetch, not the resend SDK: a dependency for
 *  this would be a dependency to keep up to date. */
async function send(
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
function logger(subject: string) {
  return (reason: string): null => {
    console.log(`[mail] ${subject}: ${reason}`);
    return null;
  };
}
