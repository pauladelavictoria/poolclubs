import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseServer } from "@/libs/supabase/server";
import { getSupabaseServiceRole } from "@/libs/supabase/serviceRole";
import { encryptSecret, verifyYoutubeState } from "@/libs/server/crypto";
import { createClubStream } from "@/libs/server/youtube.functions";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CHANNELS_ENDPOINT =
  "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true";

/**
 * Where Google sends the club owner back to — docs/youtube-streaming.md §2.3.
 * Exchanges the one-time code, reads the connecting channel, stores the
 * encrypted refresh token, then backfills a `club_streams` row for every
 * table that already has a `camera_url` on file (club_table_cameras) — an
 * admin who set up cameras before connecting YouTube shouldn't have to
 * re-click each table afterward. Best-effort: one table's provisioning
 * failing doesn't block the connection itself or the others.
 */
export const Route = createFileRoute("/api/youtube/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId = process.env.YOUTUBE_CLIENT_ID;
        const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
        if (!clientId || !clientSecret)
          return new Response(null, { status: 404 });

        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const clubId = state ? verifyYoutubeState(state) : null;
        if (!code || clubId === null)
          return new Response("Invalid or expired request.", { status: 400 });

        const supabase = getSupabaseServer();

        // Re-checked rather than trusted from the signed state: the state
        // proves this callback started from a genuine connect click, not
        // that whoever is signed in now is still an admin of that club.
        const { data: isAdmin } = await supabase.rpc("is_club_admin", {
          cid: clubId,
        });
        if (!isAdmin) return new Response(null, { status: 403 });

        const { data: club } = await supabase
          .from("clubs")
          .select("slug")
          .eq("id", clubId)
          .single();

        const tokenRes = await fetch(TOKEN_ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: `${url.origin}/api/youtube/callback`,
            grant_type: "authorization_code",
          }),
        });
        if (!tokenRes.ok) {
          console.error("youtube callback: token exchange", await tokenRes.text());
          return new Response("Google declined the connection.", { status: 502 });
        }

        const tokens = (await tokenRes.json()) as {
          access_token: string;
          refresh_token?: string;
        };
        // connect.ts always sends prompt=consent, so a missing refresh_token
        // here is a real failure, not the ordinary "already authorized" case
        // where Google otherwise omits it.
        if (!tokens.refresh_token) {
          console.error("youtube callback: no refresh_token in response");
          return new Response("Google didn't grant an offline token.", {
            status: 502,
          });
        }

        const channelRes = await fetch(CHANNELS_ENDPOINT, {
          headers: { authorization: `Bearer ${tokens.access_token}` },
        });
        const channel = (await channelRes.json())?.items?.[0] as
          | { id: string; snippet: { title: string } }
          | undefined;
        if (!channel) {
          console.error("youtube callback: no channel for this account");
          return new Response("No YouTube channel on that account.", {
            status: 502,
          });
        }

        const { data: user } = await supabase.auth.getUser();
        const serviceRole = getSupabaseServiceRole();
        const { error } = await serviceRole.from("club_youtube").upsert({
          club_id: clubId,
          refresh_token_enc: encryptSecret(tokens.refresh_token),
          channel_id: channel.id,
          channel_title: channel.snippet.title,
          connected_by: user.user!.id,
          connected_at: new Date().toISOString(),
        });
        if (error) {
          console.error("youtube callback: store club_youtube", error.message);
          return new Response("Could not save the connection.", {
            status: 500,
          });
        }

        const { data: cameras } = await serviceRole
          .from("club_table_cameras")
          .select("table_id")
          .eq("club_id", clubId);
        if (cameras && cameras.length > 0) {
          const { data: existingStreams } = await serviceRole
            .from("club_streams")
            .select("table_id")
            .eq("club_id", clubId);
          const streamed = new Set(
            (existingStreams ?? []).map((s) => s.table_id),
          );
          const unstreamedIds = cameras
            .map((c) => c.table_id)
            .filter((id) => !streamed.has(id));

          if (unstreamedIds.length > 0) {
            const { data: tables } = await serviceRole
              .from("club_tables")
              .select("id, label")
              .in("id", unstreamedIds);
            for (const table of tables ?? []) {
              try {
                // Calling the server function directly, not over HTTP — this
                // route is already server code, and createServerFn exports
                // are plain callable functions when invoked that way. Reuses
                // its own admin check and token refresh rather than a shared
                // plain helper (see createClubStream's own comment for why).
                await createClubStream({
                  data: { clubId, tableId: table.id, label: table.label },
                });
              } catch (err) {
                console.error(
                  "youtube callback: backfill stream for table",
                  table.id,
                  err,
                );
              }
            }
          }
        }

        return new Response(null, {
          status: 303,
          headers: { location: `/app/${club?.slug}/club/streaming` },
        });
      },
    },
  },
});
