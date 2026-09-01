import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseServer } from "@/libs/supabase/server";
import { CLUB_THEME_PALETTE } from "@/libs/theme/clubTheme";
import type { BallColor } from "@/types";

function pngDimensions(base64: string): string {
  const buf = Buffer.from(base64, "base64");
  return `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
}
export const Route = createFileRoute("/app/$clubSlug/manifest.webmanifest")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const supabase = getSupabaseServer();
        const { data: club } = await supabase
          .from("clubs")
          .select("slug, name, logo_url, theme_color")
          .eq("slug", params.clubSlug)
          .maybeSingle();

        if (!club) return new Response(null, { status: 404 });

        const accent =
          CLUB_THEME_PALETTE[club.theme_color as BallColor].dark.base;

        const logoBase64 = club.logo_url?.split(",")[1];

        const icons = [
          ...(logoBase64
            ? [
                {
                  src: `/api/clubs/${club.slug}/logo`,
                  sizes: pngDimensions(logoBase64),
                  type: "image/png",
                },
              ]
            : []),
          // Kept as a fallback so a club with no logo yet, or a size Chrome's
          // install heuristics won't accept, still gets a usable icon.
          {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
            // Maskable only when it's the only icon on offer: Chrome's install
            // dialog picks a `purpose: "maskable"` icon over any plain one
            // regardless of size or list order — which is why the club logo
            // above never showed up once this was marked maskable too.
            ...(logoBase64 ? {} : { purpose: "maskable" }),
          },
        ];

        const body = {
          id: `/app/${club.slug}`,
          name: club.name,
          short_name: club.name,
          description: `${club.name} en PoolClubs.`,
          lang: "es",
          start_url: `/app/${club.slug}`,
          scope: `/app/${club.slug}`,
          display: "standalone",
          theme_color: accent,
          background_color: "#090b0e",
          icons,
        };

        return new Response(JSON.stringify(body), {
          headers: {
            "content-type": "application/manifest+json",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
