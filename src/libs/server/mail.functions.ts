import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServer } from "@/libs/supabase/server";
import { MAIL_FROM, memberApprovedMail } from "@/libs/algorithms/mailText";

/**
 * Telling somebody they are in.
 *
 * Built to the same shape as sendPush (src/libs/server/push.functions.ts) and
 * for the same reasons — read that file's header first; everything it says
 * about being fired from the client after the write, rather than from a
 * database trigger, applies here unchanged.
 *
 * Where it differs is why email and not a push: a person waiting to be approved
 * has almost certainly never opened the installed app, so they have no push
 * subscription and no bell to check. The address they signed up with is the
 * only way to reach them, and this is the only moment it is legitimate to use.
 *
 * Authorisation is not here. It is approved_member_contact, a SECURITY DEFINER
 * function that decides whether the caller may know this address at all and
 * returns nothing if not — see sql/member-approved-mail.sql. This handler could
 * be called with any player id by any signed-in person and would still only
 * ever send to somebody that caller just legitimately approved.
 */

const input = z.object({ playerId: z.number().int().positive() });

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export const sendMemberApprovedMail = createServerFn({ method: "POST" })
  .validator(input)
  .handler(async ({ data }): Promise<null> => {
    const apiKey = process.env.RESEND_API_KEY;
    // Same bargain as the VAPID keys: without the credential the feature turns
    // itself off rather than failing, so a checkout with no secrets still runs
    // and CI does not send mail.
    if (!apiKey) return log("no RESEND_API_KEY in this build", data);

    const supabase = getSupabaseServer();
    const { data: rows, error } = await supabase.rpc(
      "approved_member_contact",
      { p_player_id: data.playerId },
    );
    if (error) return log(`contact lookup failed: ${error.message}`, data);

    // The function returning nothing is the ordinary "no" — not an admin, not
    // approved yet, a roster row nobody has ever signed into. None of those is
    // an error worth a stack trace.
    const contact = rows?.[0];
    if (!contact?.email) return log("no address, or not allowed to know", data);

    const body = memberApprovedMail({
      name: contact.name,
      clubName: contact.club_name,
      clubSlug: contact.club_slug,
    });

    // fetch, not the resend SDK: this is one POST with a bearer token, and a
    // dependency for it would be a dependency to keep up to date.
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [contact.email],
        subject: body.subject,
        html: body.html,
        text: body.text,
      }),
    });

    if (!response.ok) {
      // Read the body: Resend puts the actual reason in it, and a bare 403 in
      // the deploy log is indistinguishable from a wrong key, an unverified
      // domain and a rate limit.
      const detail = await response.text().catch(() => "");
      return log(`resend ${response.status}: ${detail.slice(0, 300)}`, data);
    }

    return log("sent", data);
  });

/**
 * One line to the deploy logs, returning null so every bail-out above can be
 * written as `return log(...)`.
 *
 * Never thrown and never sent to the client, exactly as in push.functions.ts:
 * the approval already succeeded before this ran, and a member who is in the
 * club but did not get an email is in the club. Logging the success case too,
 * because otherwise "sent" and "silently did nothing" look identical from
 * outside — which is the one thing that made the first push failure in
 * production impossible to diagnose.
 *
 * The address is deliberately not logged.
 */
function log(reason: string, data: z.infer<typeof input>): null {
  console.log(`[mail] memberApproved#${data.playerId}: ${reason}`);
  return null;
}
