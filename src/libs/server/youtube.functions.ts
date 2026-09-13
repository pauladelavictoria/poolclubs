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
 * Club-admin actions on club_youtube / club_streams — docs/youtube-streaming.md
 * §2.6. Both tables deny all anon/authenticated access (§2.2), so every read
 * and write here goes through the service-role client; the admin check that
 * would ordinarily be RLS happens by hand instead, same as
 * routes/api/clubs/$slug/obs-scenes.json.ts and routes/api/youtube/*.ts.
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

/** One row per table with a camera. stream_key_enc never leaves the server
 *  after creation — "show the ingest URL and key to the owner once" (§2.3). */
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
 *  duplicating. */
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

    // The only moment the plaintext key is ever handed back to the browser.
    return {
      id: row.id,
      ingestionAddress: stream.ingestionAddress,
      streamKey: stream.streamKey,
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
