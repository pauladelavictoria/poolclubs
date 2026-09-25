import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServer } from "@/libs/supabase/server";
import { getSupabaseServiceRole } from "@/libs/supabase/serviceRole";
import { encryptSecret, decryptSecret } from "@/libs/server/crypto";
import {
  refreshYoutubeAccessToken,
  createReusableStream,
  deleteYoutubeStream,
} from "@/libs/server/youtube";

/**
 * Actions on club_youtube / club_streams — most of them club-admin only
 * (docs/youtube-streaming.md §2.6), plus one open to any signed-in member
 * (§2.5's getStreamedTableIds). Both tables deny all anon/authenticated
 * access (§2.2), so every read and write here goes through the service-role
 * client; the admin check that would ordinarily be RLS happens by hand
 * instead, same as routes/api/clubs/$slug/obs-scenes.json.ts and
 * routes/api/youtube/*.ts.
 *
 * Every input is validated: a server function is a public HTTP endpoint
 * whatever it looks like from the call site.
 */

/** Throws if the signed-in caller is not this club's admin. is_club_admin is
 *  granted to authenticated, so this runs against the caller's own session —
 *  no service-role client needed for the check itself. */
async function assertClubAdmin(clubId: number) {
  const { data: isAdmin } = await getSupabaseServer().rpc("is_club_admin", {
    cid: clubId,
  });
  if (!isAdmin) throw new Error("not a club admin");
}

const clubIdInput = z.object({ clubId: z.number().int().positive() });

/**
 * Which of the club's tables have a camera — no admin gate: the "Record this
 * game" checkbox (§2.5) needs this from any signed-in seat starting a game,
 * not just an admin's, and which tables are streamed is not sensitive on its
 * own. Only requires a session at all, to keep parity with the rest of the
 * app's server functions.
 */
export const getStreamedTableIds = createServerFn({ method: "GET" })
  .validator(clubIdInput)
  .handler(async ({ data }) => {
    const { data: user } = await getSupabaseServer().auth.getUser();
    if (!user.user) throw new Error("not signed in");

    const { data: rows } = await getSupabaseServiceRole()
      .from("club_streams")
      .select("table_id")
      .eq("club_id", data.clubId);
    return (rows ?? []).map((r) => r.table_id);
  });

/**
 * Broadcasts live right now, by live_match_id — the Watch player on /night.
 * Unlisted ones included, so gated on membership rather than just a session:
 * an unlisted id is the whole secret, and only the players' own club sees it.
 */
export const getLiveBroadcasts = createServerFn({ method: "GET" })
  .validator(clubIdInput)
  .handler(async ({ data }) => {
    const { data: isMember } = await getSupabaseServer().rpc(
      "is_club_member",
      { cid: data.clubId },
    );
    if (!isMember) throw new Error("not a club member");

    const { data: rows } = await getSupabaseServiceRole()
      .from("stream_sessions")
      .select("live_match_id, broadcast_id, club_streams!inner(club_id)")
      .eq("state", "live")
      .eq("club_streams.club_id", data.clubId);
    return Object.fromEntries(
      (rows ?? [])
        .filter((r) => r.broadcast_id)
        .map((r) => [r.live_match_id, r.broadcast_id!]),
    ) as Record<string, string>;
  });

/**
 * The recording of one filed game, if it has one — the player on the game's
 * page. Stamped onto the session by finish_live_match(). Same member gate as
 * getLiveBroadcasts, checked against the camera's club once the row is found.
 */
export const getGameRecording = createServerFn({ method: "GET" })
  .validator(z.object({ gameId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { data: row } = await getSupabaseServiceRole()
      .from("stream_sessions")
      .select("broadcast_id, club_streams!inner(club_id)")
      .eq("game_id", data.gameId)
      .in("state", ["live", "complete"])
      .maybeSingle();
    if (!row?.broadcast_id) return null;

    const { data: isMember } = await getSupabaseServer().rpc(
      "is_club_member",
      { cid: row.club_streams.club_id },
    );
    return isMember ? row.broadcast_id : null;
  });

/** Connection state only — channel_title / connected_at, never the token
 *  (§2.2's "Security" note: owners see this through a narrow read, never the
 *  refresh_token_enc column). */
export const getYoutubeConnection = createServerFn({ method: "GET" })
  .validator(clubIdInput)
  .handler(async ({ data }) => {
    await assertClubAdmin(data.clubId);
    const { data: row } = await getSupabaseServiceRole()
      .from("club_youtube")
      .select("channel_title, connected_at")
      .eq("club_id", data.clubId)
      .maybeSingle();
    return row;
  });

export const disconnectYoutube = createServerFn({ method: "POST" })
  .validator(clubIdInput)
  .handler(async ({ data }) => {
    await assertClubAdmin(data.clubId);
    const serviceRole = getSupabaseServiceRole();
    // club_streams only points at clubs/club_tables, not club_youtube, so a
    // disconnect has to take its streams down by hand — stream_sessions
    // cascades off club_streams on its own (schema.sql).
    await serviceRole.from("club_streams").delete().eq("club_id", data.clubId);
    await serviceRole.from("club_youtube").delete().eq("club_id", data.clubId);
    return null;
  });

/** One row per table with a camera. The key itself isn't here — reveal it
 *  with `revealClubStream` — this list is what OBS setup and the "already
 *  streaming" state need without touching the encrypted column at all. */
export const listClubStreams = createServerFn({ method: "GET" })
  .validator(clubIdInput)
  .handler(async ({ data }) => {
    await assertClubAdmin(data.clubId);
    const { data: rows } = await getSupabaseServiceRole()
      .from("club_streams")
      .select("id, table_id, label, ingestion_address")
      .eq("club_id", data.clubId);
    return rows ?? [];
  });

const createStreamInput = z.object({
  clubId: z.number().int().positive(),
  tableId: z.number().int().positive(),
  label: z.string().trim().min(1).max(60),
});

/** One reusable YouTube liveStream per table (Decisions: "Two tables
 *  streaming simultaneously means two liveStream resources and two
 *  encoders"). Re-running this for a table that already has one replaces it
 *  — club_streams.table_id is unique, so the upsert rebinds rather than
 *  duplicating.
 *
 *  Also called directly, server-side, by the OAuth callback's backfill for
 *  tables that already had a camera_url when YouTube got connected —
 *  `createServerFn` exports are plain callable functions, so no HTTP round
 *  trip happens when the caller is already on the server. Deliberately not
 *  factored into a shared plain helper: a top-level function outside any
 *  `.handler()` isn't stripped from the client bundle, and this one touches
 *  `encryptSecret`, which imports `node:crypto` — that leaked into the
 *  browser once already. */
export const createClubStream = createServerFn({ method: "POST" })
  .validator(createStreamInput)
  .handler(async ({ data }) => {
    await assertClubAdmin(data.clubId);
    const serviceRole = getSupabaseServiceRole();

    const { data: connection } = await serviceRole
      .from("club_youtube")
      .select("refresh_token_enc")
      .eq("club_id", data.clubId)
      .maybeSingle();
    if (!connection) throw new Error("club is not connected to YouTube");

    const accessToken = await refreshYoutubeAccessToken(
      decryptSecret(connection.refresh_token_enc),
    );
    const stream = await createReusableStream(accessToken, data.label);

    const { data: row, error } = await serviceRole
      .from("club_streams")
      .upsert(
        {
          club_id: data.clubId,
          table_id: data.tableId,
          youtube_stream_id: stream.streamId,
          ingestion_address: stream.ingestionAddress,
          stream_key_enc: encryptSecret(stream.streamKey),
          label: data.label,
        },
        { onConflict: "table_id" },
      )
      .select("id")
      .single();
    if (error) throw error;

    return {
      id: row.id,
      ingestionAddress: stream.ingestionAddress,
      streamKey: stream.streamKey,
    };
  });

const revealStreamInput = z.object({
  clubId: z.number().int().positive(),
  streamId: z.number().int().positive(),
});

/** Decrypts and returns one stream's ingest URL and key on demand. The
 *  encryption at rest (defence in depth against a leaked service-role key or
 *  a DB dump, per crypto.ts) is the boundary here, not a one-time reveal —
 *  any admin of this club can call this again later, the same access every
 *  other action on this screen already requires. */
export const revealClubStream = createServerFn({ method: "POST" })
  .validator(revealStreamInput)
  .handler(async ({ data }) => {
    await assertClubAdmin(data.clubId);
    const { data: row } = await getSupabaseServiceRole()
      .from("club_streams")
      .select("club_id, ingestion_address, stream_key_enc")
      .eq("id", data.streamId)
      .single();
    if (!row || row.club_id !== data.clubId) throw new Error("not found");
    return {
      ingestionAddress: row.ingestion_address,
      streamKey: decryptSecret(row.stream_key_enc),
    };
  });

const streamIdInput = z.object({
  clubId: z.number().int().positive(),
  streamId: z.number().int().positive(),
});

export const deleteClubStream = createServerFn({ method: "POST" })
  .validator(streamIdInput)
  .handler(async ({ data }) => {
    await assertClubAdmin(data.clubId);
    const serviceRole = getSupabaseServiceRole();

    const { data: row } = await serviceRole
      .from("club_streams")
      .select("youtube_stream_id, club_id")
      .eq("id", data.streamId)
      .single();
    if (!row || row.club_id !== data.clubId) throw new Error("not found");

    const { data: connection } = await serviceRole
      .from("club_youtube")
      .select("refresh_token_enc")
      .eq("club_id", data.clubId)
      .maybeSingle();
    if (connection) {
      // Best-effort: a stream already gone or revoked on Google's side must
      // not block clearing our own row.
      try {
        const accessToken = await refreshYoutubeAccessToken(
          decryptSecret(connection.refresh_token_enc),
        );
        await deleteYoutubeStream(accessToken, row.youtube_stream_id);
      } catch (err) {
        console.error("deleteClubStream: youtube delete", err);
      }
    }

    await serviceRole.from("club_streams").delete().eq("id", data.streamId);
    return null;
  });
