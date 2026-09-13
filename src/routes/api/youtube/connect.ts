import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseServer } from "@/libs/supabase/server";
import { signYoutubeState } from "@/libs/server/crypto";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPE = "https://www.googleapis.com/auth/youtube";

/**
 * Kicks off the club's YouTube connection — docs/youtube-streaming.md §2.3.
 * `?club=<slug>`, linked from the club's settings screen (§2.6, not yet
 * built) once an owner clicks "Connect YouTube".
 *
 * `access_type=offline` + `prompt=consent` is what makes Google hand back a
 * refresh_token at all — without `prompt=consent`, a returning user who
 * already granted this scope gets none, since Google only issues one on
 * first consent by default.
 *
 * No VAPID/Resend-style silent turn-off here: a missing YOUTUBE_CLIENT_ID
 * would otherwise send an admin to a Google error page with no context, so
 * this fails with a 404 before ever redirecting.
 */
export const Route = createFileRoute("/api/youtube/connect")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId = process.env.YOUTUBE_CLIENT_ID;
        if (!clientId) return new Response(null, { status: 404 });

        const url = new URL(request.url);
        const slug = url.searchParams.get("club");
        if (!slug) return new Response(null, { status: 400 });

        const supabase = getSupabaseServer();
        const { data: club } = await supabase
          .from("clubs")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (!club) return new Response(null, { status: 404 });

        // Same primitive obs-scenes.json.ts uses: club_tables (and by
        // extension what runs a stream) has no admin-only RLS policy of its
        // own, so the check happens here.
        const { data: isAdmin } = await supabase.rpc("is_club_admin", {
          cid: club.id,
        });
        if (!isAdmin) return new Response(null, { status: 403 });

        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: `${url.origin}/api/youtube/callback`,
          response_type: "code",
          scope: SCOPE,
          access_type: "offline",
          prompt: "consent",
          state: signYoutubeState(club.id),
        });

        return new Response(null, {
          status: 303,
          headers: { location: `${AUTH_ENDPOINT}?${params}` },
        });
      },
    },
  },
});
