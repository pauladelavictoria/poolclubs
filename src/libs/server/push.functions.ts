import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServer } from "@/libs/supabase/server";
import { pushText, type PushKey } from "@/libs/algorithms/pushText";

/**
 * Sending a web push.
 *
 * Fired by the client, from the hook that just wrote the row (useChallenges,
 * useTournaments) — not by a database trigger. All three events are written
 * exclusively from the browser today, so a trigger plus pg_net would buy nothing
 * and cost an extension, a shared secret and dashboard config that lives outside
 * git. The price is a push lost if the sender's browser dies mid-request, which
 * is survivable: the in-app bell (useNotifications) derives the same feed from
 * the same rows and is the actual record.
 *
 * The row is read twice, for two different reasons. Once here under RLS, purely
 * for the words — whose name, which club. And once inside push_targets, which is
 * SECURITY DEFINER and is the *only* authorisation that matters: it decides who
 * may be told about this event and hands back their subscriptions, or returns
 * nothing at all. See sql/schema.sql.
 */

/** What sw.js reads out of event.data. Kept under ~3KB by construction; the
 *  practical web push ceiling is about 3000 bytes of encrypted payload. */
type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

/** Not an env var: it is not a secret and it does not vary by deploy. VAPID
 *  requires a mailto: or https: contact for the push service to complain to. */
const VAPID_SUBJECT = "mailto:hello@poolclubs.app";

const input = z.object({
  kind: z.enum([
    "challengeSent",
    "challengeAnswered",
    "tournamentOpen",
    "commentMention",
    "nightCall",
  ]),
  /** The row the event is about — for `nightCall`, the club itself: being
   *  called to a ranking night points at nothing smaller. */
  id: z.number().int().positive(),
});

export const sendPush = createServerFn({ method: "POST" })
  .validator(input)
  .handler(async ({ data }): Promise<null> => {
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!privateKey || !publicKey)
      return log("no VAPID keys in this build", data);

    const supabase = getSupabaseServer();

    // What to say. Read under RLS, so a caller who cannot see the row gets
    // nothing — but this is not the permission check, push_targets is.
    const text = await describe(supabase, data.kind, data.id);
    if (!text)
      return log("row not visible to the caller, or wrong status", data);

    const { data: targets, error } = await supabase.rpc("push_targets", {
      p_kind: data.kind,
      p_ref: data.id,
    });
    if (error) return log(`push_targets failed: ${error.message}`, data);
    if (!targets?.length)
      return log("no eligible recipient is subscribed", data);

    // Dynamic import: createServerFn already strips this handler from the client
    // bundle, but web-push is CommonJS and Node-only, and one line buys
    // certainty that it can never be asked to run in a browser.
    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);

    const sent = await Promise.allSettled(
      targets.map((target) =>
        webpush.sendNotification(
          {
            endpoint: target.endpoint,
            keys: { p256dh: target.p256dh, auth: target.auth },
          },
          JSON.stringify({
            title: text.title,
            body: pushText(target.lang, text.key, text.vars),
            url: text.url,
            tag: text.tag,
          } satisfies PushPayload),
        ),
      ),
    );

    // 404 and 410 mean that subscription is gone for good — the browser was
    // uninstalled, or permission was revoked. Anything else is this send's
    // problem, not the row's, so the row stays.
    const dead = sent.flatMap((result, i) =>
      result.status === "rejected" &&
      (result.reason?.statusCode === 404 || result.reason?.statusCode === 410)
        ? [targets[i].endpoint]
        : [],
    );
    if (dead.length) await supabase.rpc("push_prune", { p_endpoints: dead });

    // The one place this is worth a line even when it worked: everything above
    // returns the same `null` on success and on every bail-out, so without the
    // count the deploy logs cannot tell "sent to two devices" from "did nothing".
    const failed = sent.filter((r) => r.status === "rejected");
    log(
      `sent ${sent.length - failed.length}/${sent.length}` +
        (dead.length ? `, pruned ${dead.length} dead` : "") +
        failed
          .map(
            (r) =>
              `, failed ${r.reason?.statusCode ?? "?"} ${r.reason?.body ?? r.reason?.message ?? ""}`,
          )
          .join(""),
      data,
    );

    // Always null. The caller learns nothing about who was reached, and a push
    // that failed to send is never a reason to show anybody an error.
    return null;
  });

/**
 * One line to the deploy logs, returning null so every bail-out above can be
 * written as `return log(...)`.
 *
 * Deliberately not a thrown error and deliberately not sent to the client: a
 * push is a nudge, and the bell already carries the same event. But silence and
 * success were indistinguishable from outside, which made the first failure in
 * production impossible to diagnose from the logs alone.
 */
function log(reason: string, data: z.infer<typeof input>): null {
  console.log(`[push] ${data.kind}#${data.id}: ${reason}`);
  return null;
}

/** The translatable half of a notification: which string, with what filled in,
 *  and where tapping it goes. `title` is the club's own name, which needs no
 *  translating and tells a member of two clubs which one just buzzed. */
type PushText = {
  title: string;
  key: PushKey;
  vars: Record<string, string>;
  url: string;
  /** Same composite ids the bell uses for AppNotification.id, so re-sending an
   *  event replaces its notification instead of stacking a second one. */
  tag: string;
};

async function describe(
  supabase: ReturnType<typeof getSupabaseServer>,
  kind: z.infer<typeof input>["kind"],
  id: number,
): Promise<PushText | null> {
  if (kind === "tournamentOpen") {
    const { data } = await supabase
      .from("tournaments")
      .select("id, name, club:clubs!inner(name, slug)")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;

    return {
      title: data.club.name,
      key: "notifications.tournamentOpen",
      vars: { name: data.name },
      url: `/app/${data.club.slug}/tournaments/${data.id}`,
      tag: `tournament-open:${data.id}`,
    };
  }

  if (kind === "nightCall") {
    const { data } = await supabase
      .from("clubs")
      .select("id, name, slug, night_call_at")
      .eq("id", id)
      .maybeSingle();
    if (!data?.night_call_at) return null;

    return {
      title: data.name,
      key: "notifications.nightCall",
      vars: {},
      url: `/app/${data.slug}/night`,
      // The moment, not the club: a second call two hours later is a second
      // thing to be told, and a tag of just the club would have it silently
      // replace the first on a phone nobody had picked up.
      tag: `night-call:${data.id}:${data.night_call_at}`,
    };
  }

  if (kind === "commentMention") {
    const { data } = await supabase
      .from("comments")
      .select(
        `id, tournament_id,
         club:clubs!inner(name, slug),
         author:players!inner(person:people!inner(name))`,
      )
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;

    return {
      title: data.club.name,
      key: "notifications.mention",
      vars: { name: data.author.person.name },
      // A tournament thread has a public page, and the person mentioned there
      // may be in no club at all — so that one link, and the club feed for the
      // threads that only members can read.
      url: data.tournament_id
        ? `/tournaments/${data.tournament_id}`
        : `/app/${data.club.slug}`,
      tag: `mention:${data.id}`,
    };
  }

  const { data } = await supabase
    .from("challenges")
    .select(
      `id, status,
       club:clubs!inner(name, slug),
       from_player:players!challenges_from_player_id_fkey!inner(person:people!inner(name)),
       to_player:players!challenges_to_player_id_fkey!inner(person:people!inner(name))`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  // Who the recipient is being told about is the *other* side: the challenged
  // player hears about the challenger, the challenger hears about the answer.
  if (kind === "challengeSent") {
    return {
      title: data.club.name,
      key: "notifications.challengeReceived",
      vars: { name: data.from_player.person.name },
      url: `/app/${data.club.slug}/challenges`,
      tag: `challenge:${data.id}:pending`,
    };
  }

  if (data.status !== "accepted" && data.status !== "declined") return null;

  return {
    title: data.club.name,
    key:
      data.status === "accepted"
        ? "notifications.challengeAccepted"
        : "notifications.challengeDeclined",
    vars: { name: data.to_player.person.name },
    url: `/app/${data.club.slug}/challenges`,
    tag: `challenge:${data.id}:${data.status}`,
  };
}
