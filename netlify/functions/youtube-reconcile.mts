import { getSupabaseServiceRole } from "../../src/libs/supabase/serviceRole";
import { decryptSecret } from "../../src/libs/server/crypto";
import { sendMail, logger } from "../../src/libs/server/resend";
import { gameRecordingMail } from "../../src/libs/algorithms/mailText";
import {
  refreshYoutubeAccessToken,
  insertBroadcast,
  bindBroadcast,
  deleteBroadcast,
  streamStatus,
  transitionBroadcast,
} from "../../src/libs/server/youtube";
import {
  nextStreamStep,
  wantedMatch,
  type ActiveSession,
} from "../../src/libs/algorithms/streamSession";
import type { Database } from "../../src/types/database.types.gen";

/**
 * Drives every club's cameras toward the broadcast state their tables
 * actually want, once a minute — docs/youtube-streaming.md §2.4.
 *
 * Desired state per club_streams row (one per camera/table): the current
 * live_matches row on that table if `tournament_match_id is not null`
 * (always desired, always public — no checkbox) or `record_opt_in = true`
 * (privacy from `record_privacy`); otherwise nothing. Actual state is the
 * newest non-terminal stream_sessions row for that club_stream.
 *
 * Plain relative imports rather than the `@/` alias: this file is bundled by
 * Netlify's own esbuild step, outside Vite's graph, so the alias — defined
 * only for Vite via tsconfig `paths` — would not resolve here.
 *
 * UNVERIFIED (doc's open question #2): whether this coexists with
 * @netlify/vite-plugin-tanstack-start's own emitted function — netlify.toml
 * sets no `[functions] directory`. If they conflict at deploy, the doc's
 * fallback is Supabase pg_cron + pg_net hitting a server route instead.
 */
type ClubStream = Pick<
  Database["public"]["Tables"]["club_streams"]["Row"],
  "id" | "club_id" | "table_id" | "youtube_stream_id" | "label"
>;

export default async () => {
  const db = getSupabaseServiceRole();

  // Before the YouTube gate, not after: a completed session can still be
  // waiting on its mail after the YouTube credentials were removed.
  await deliverCompletedSessions(db);

  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.TOKEN_ENCRYPTION_KEY) {
    // Same bargain as VAPID/Resend elsewhere in the app: a build with no
    // YouTube secrets configured (dev, CI, a fresh deploy before OAuth is
    // set up) no-ops rather than failing every cron tick.
    return new Response("youtube not configured");
  }

  const [{ data: streams }, { data: connections }] = await Promise.all([
    db
      .from("club_streams")
      .select("id, club_id, table_id, youtube_stream_id, label"),
    db.from("club_youtube").select("club_id, refresh_token_enc"),
  ]);

  const refreshTokenByClub = new Map(
    (connections ?? []).map((c) => [c.club_id, c.refresh_token_enc]),
  );
  // One refresh per club per tick, shared across every table on it —
  // liveStreams.list-class quota, not per-table (§2.1a).
  const accessTokenByClub = new Map<number, Promise<string>>();
  const accessTokenFor = (clubId: number, refreshTokenEnc: string) => {
    let cached = accessTokenByClub.get(clubId);
    if (!cached) {
      cached = refreshYoutubeAccessToken(decryptSecret(refreshTokenEnc));
      accessTokenByClub.set(clubId, cached);
    }
    return cached;
  };

  for (const stream of streams ?? []) {
    const refreshTokenEnc = refreshTokenByClub.get(stream.club_id);
    // Disconnected since this row was created, or mid-disconnect — nothing
    // to drive this tick, and disconnectYoutube already took the row's
    // sessions down with it.
    if (!refreshTokenEnc) continue;

    try {
      await reconcileTable(db, stream, () =>
        accessTokenFor(stream.club_id, refreshTokenEnc),
      );
    } catch (err) {
      console.error(`youtube-reconcile: table ${stream.table_id}`, err);
    }
  }

  return new Response("ok");
};

export const config = { schedule: "* * * * *" };

/**
 * One table's tick: ask nextStreamStep what to do, do it, ask again — until it
 * says wait, or the step is one that only a later tick can move on (opening a
 * session, polling the encoder). The decisions, and their tests, are in
 * libs/algorithms/streamSession.ts; this is only the I/O.
 */
async function reconcileTable(
  db: ReturnType<typeof getSupabaseServiceRole>,
  stream: ClubStream,
  getAccessToken: () => Promise<string>,
) {
  const { data: liveRow } = await db
    .from("live_matches")
    .select(
      "id, tournament_match_id, record_opt_in, record_privacy, player_1_id, player_2_id, player_1b_id, player_2b_id",
    )
    .eq("table_id", stream.table_id)
    .maybeSingle();
  const wanted = wantedMatch(liveRow);

  let active: ActiveSession | null = (
    await db
      .from("stream_sessions")
      .select("id, live_match_id, state, broadcast_id, privacy_status")
      .eq("club_stream_id", stream.id)
      .in("state", ["created", "bound", "live"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ).data;

  const update = (
    id: number,
    patch: Database["public"]["Tables"]["stream_sessions"]["Update"],
  ) => db.from("stream_sessions").update(patch).eq("id", id).throwOnError();

  // Bounded: at most finish → insert → bind → poll in one tick.
  for (let i = 0; i < 4; i++) {
    const step = nextStreamStep(wanted, active);
    switch (step.kind) {
      case "wait":
        return;

      case "complete":
        await transitionBroadcast(
          await getAccessToken(),
          step.broadcastId,
          "complete",
        );
        await update(step.sessionId, {
          state: "complete",
          completed_at: new Date().toISOString(),
        });
        active = null;
        break;

      case "abandon":
        // Nothing was broadcast, so there is nothing to keep: delete the
        // empty broadcast rather than leave it on the club's channel.
        if (step.broadcastId)
          await deleteBroadcast(await getAccessToken(), step.broadcastId);
        await update(step.sessionId, {
          state: "error",
          error: "match ended before the encoder connected",
        });
        active = null;
        break;

      case "open":
        await db
          .from("stream_sessions")
          .insert({
            club_stream_id: stream.id,
            live_match_id: step.matchId,
            privacy_status: step.privacy,
            state: "created",
            // Snapshotted now because live_matches won't exist by the time
            // this session reaches 'complete' — finish_live_match() deletes it
            // the instant the match ends, which is exactly when
            // deliverCompletedSessions needs to know who to email (§2.5).
            player_1_id: liveRow!.player_1_id,
            player_2_id: liveRow!.player_2_id,
            player_1b_id: liveRow!.player_1b_id,
            player_2b_id: liveRow!.player_2b_id,
          })
          .throwOnError();
        return;

      case "insert": {
        const broadcastId = await insertBroadcast(
          await getAccessToken(),
          stream.label,
          step.privacy,
        );
        // Saved before binding: a bind that fails now is retried against
        // this broadcast, not answered with a new one every minute.
        await update(step.sessionId, { broadcast_id: broadcastId });
        active = { ...active!, broadcast_id: broadcastId };
        break;
      }

      case "bind":
        await bindBroadcast(
          await getAccessToken(),
          step.broadcastId,
          stream.youtube_stream_id,
        );
        await update(step.sessionId, { state: "bound" });
        active = { ...active!, state: "bound" };
        break;

      case "poll": {
        const accessToken = await getAccessToken();
        const status = await streamStatus(
          accessToken,
          stream.youtube_stream_id,
        );
        if (status !== "active") {
          // Logged every tick while waiting: no session has gone live in
          // production yet, and this is what says whether OBS is sending.
          console.log(
            `youtube-reconcile: table ${stream.table_id} waiting, streamStatus=${status}`,
          );
          return;
        }
        // transition(live) fails until the encoder is actually receiving data
        // (§2.1's Constraints) — the status above is what confirms that.
        await transitionBroadcast(accessToken, step.broadcastId, "live");
        await update(step.sessionId, {
          state: "live",
          went_live_at: new Date().toISOString(),
        });
        return;
      }
    }
  }
}

/**
 * The delivery half of §2.5: every session that reached 'complete' and
 * hasn't been mailed yet. Its own pass over every club rather than folded
 * into reconcileTable's per-table loop — a crash between marking 'complete'
 * and stamping notified_at must not lose the mail, and a session no longer
 * counts as "active" the moment it's complete, so nothing else would ever
 * revisit it. Runs before the YOUTUBE_CLIENT_ID gate in the handler: a
 * completed session can still be waiting on notified_at even if the YouTube
 * credentials were since removed.
 */
async function deliverCompletedSessions(
  db: ReturnType<typeof getSupabaseServiceRole>,
) {
  const apiKey = process.env.RESEND_API_KEY;
  // Same bargain as every other mail in the app: no key, no send, and dev/CI
  // just no-op rather than fail the tick.
  if (!apiKey) return;

  const { data: sessions } = await db
    .from("stream_sessions")
    .select(
      "id, broadcast_id, player_1_id, player_2_id, player_1b_id, player_2b_id",
    )
    .eq("state", "complete")
    .is("notified_at", null);

  for (const session of sessions ?? []) {
    if (!session.broadcast_id) continue;
    const say = logger(`gameRecording#${session.id}`);

    // The generated RPC type wants plain numbers — the SQL function itself
    // (sql/schema.sql) is happy with SQL NULL for an empty seat, `= any()`
    // simply never matching it, but that nullability isn't reflected in the
    // generated signature.
    const { data: recipients, error } = await db.rpc(
      "stream_session_recipients",
      {
        p_player_1_id: session.player_1_id as number,
        p_player_2_id: session.player_2_id as number,
        p_player_1b_id: session.player_1b_id as number,
        p_player_2b_id: session.player_2b_id as number,
      },
    );
    if (error) {
      console.error(`youtube-reconcile: recipients#${session.id}`, error);
      continue;
    }

    const videoUrl = `https://youtu.be/${session.broadcast_id}`;
    // allSettled: one address whose send throws must not leave the session
    // unstamped, or everyone on it is mailed again next tick.
    await Promise.allSettled(
      (recipients ?? [])
        .filter((r) => r.email)
        .map((r) =>
          sendMail(
            apiKey,
            r.email!,
            say,
            gameRecordingMail({ name: r.name ?? r.email!, videoUrl }),
          ),
        ),
    );

    // Stamped regardless of whether there were any recipients at all (a
    // device-only match, say) — either way there is nothing left to retry.
    await db
      .from("stream_sessions")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", session.id);
  }
}
