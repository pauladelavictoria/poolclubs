import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseServer } from "@/libs/supabase/server";

const DATA_URL = /^data:(image\/\w+);base64,(.+)$/;

/**
 * A club's logo as a real, fetchable image — `clubs.logo_url` only ever holds
 * a `data:` URI (see libs/browser/logoImage.ts), which is fine inline in the app but
 * useless anywhere something else has to fetch it over HTTP, such as a web
 * app manifest's `icons[].src`. This just unwraps the stored data URI back
 * into bytes on the way out.
 *
 * Read with the server client, so the same RLS a browser would get applies:
 * a public club's logo is open to anyone, a private one only to its members.
 */
export const Route = createFileRoute("/api/clubs/$slug/logo")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const supabase = getSupabaseServer();
        const { data: club } = await supabase
          .from("clubs")
          .select("logo_url")
          .eq("slug", params.slug)
          .maybeSingle();

        const match = club?.logo_url?.match(DATA_URL);
        if (!match) return new Response(null, { status: 404 });

        const [, contentType, base64] = match;
        return new Response(Buffer.from(base64, "base64"), {
          headers: {
            "content-type": contentType,
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
