import { getSupabaseServiceRole } from "../../src/libs/supabase/serviceRole";
import { decryptSecret } from "../../src/libs/server/crypto";
import {
  refreshYoutubeAccessToken,
  insertBroadcast,
  bindBroadcast,
  isStreamActive,
  transitionBroadcast,
} from "../../src/libs/server/youtube";
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
type StreamSession = Database["public"]["Tables"]["stream_sessions"]["Row"];
type ClubStream = Pick<
  Database["public"]["Tables"]["club_streams"]["Row"],
  "id" | "club_id" | "table_id" | "youtube_stream_id" | "label"
>;

export default async () => {
  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.TOKEN_ENCRYPTION_KEY) {
    // Same bargain as VAPID/Resend elsewhere in the app: a build with no
    // YouTube secrets configured (dev, CI, a fresh deploy before OAuth is
    // set up) no-ops rather than failing every cron tick.
    return new Response("youtube not configured");
  }

  const db = getSupabaseServiceRole();

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

async function reconcileTable(
  db: ReturnType<typeof getSupabaseServiceRole>,
  stream: ClubStream,
  getAccessToken: () => Promise<string>,
) {
  const { data: liveRow } = await db
    .from("live_matches")
    .select("id, tournament_match_id, record_opt_in, record_privacy")
    .eq("table_id", stream.table_id)
    .maybeSingle();

  const wanted =
    liveRow && (liveRow.tournament_match_id !== null || liveRow.record_opt_in)
      ? liveRow
      : null;

  let active: StreamSession | null = (
    await db
      .from("stream_sessions")
      .select("*")
      .eq("club_stream_id", stream.id)
      .in("state", ["created", "bound", "live"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ).data;

  // The match this session was tracking ended — the table went idle, or a
  // new match already replaced it. Finalize before anything below runs.
  if (active && active.live_match_id !== (wanted?.id ?? null)) {
    const accessToken = await getAccessToken();
    if (active.state === "live" && active.broadcast_id) {
      await transitionBroadcast(accessToken, active.broadcast_id, "complete");
      await db
        .from("stream_sessions")
        .update({ state: "complete", completed_at: new Date().toISOString() })
        .eq("id", active.id);
    } else {
      // Never reached 'live' — nothing was actually broadcast, so there is
      // no VOD to preserve and transition(complete) only accepts a
      // broadcast that has been live or testing, so this is filed as an
      // error rather than an API call YouTube would refuse.
      await db
        .from("stream_sessions")
        .update({
          state: "error",
          error: "match ended before the encoder connected",
        })
        .eq("id", active.id);
    }
    active = null;
  }

  if (!wanted) return;

  if (!active) {
    await db.from("stream_sessions").insert({
      club_stream_id: stream.id,
      live_match_id: wanted.id,
      privacy_status: wanted.tournament_match_id
        ? "public"
        : (wanted.record_privacy ?? "unlisted"),
      state: "created",
    });
    return;
  }

  const accessToken = await getAccessToken();

  if (active.state === "created") {
    const broadcastId = await insertBroadcast(
      accessToken,
      stream.label,
      active.privacy_status as "public" | "unlisted",
    );
    await bindBroadcast(accessToken, broadcastId, stream.youtube_stream_id);
    await db
      .from("stream_sessions")
      .update({ broadcast_id: broadcastId, state: "bound" })
      .eq("id", active.id);
    return;
  }

  if (
    active.state === "bound" &&
    (await isStreamActive(accessToken, stream.youtube_stream_id))
  ) {
    // transition(live) fails until the encoder is actually receiving data
    // (§2.1's Constraints) — isStreamActive above is what confirms that.
    await transitionBroadcast(accessToken, active.broadcast_id!, "live");
    await db
      .from("stream_sessions")
      .update({ state: "live", went_live_at: new Date().toISOString() })
      .eq("id", active.id);
  }
  // Otherwise: still waiting for the encoder, or already 'live' with
  // nothing to do until the match ends — both retried next tick.
}
