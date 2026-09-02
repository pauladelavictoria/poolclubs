import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseServer } from "@/libs/supabase/server";
import { CLUB_THEME_PALETTE } from "@/libs/theme/clubTheme";
import { pngSize } from "@/libs/algorithms/pngSize";
import type { BallColor } from "@/types";

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
        // Null covers both "no logo" and "a logo these bytes say is not a PNG",
        // and the two want the same treatment: leave the icon out rather than
        // describe it wrongly, and let the fallbacks below carry the install.
        const logoSize = logoBase64 ? pngSize(logoBase64) : null;

        const icons = [
          ...(logoSize
            ? [
                {
                  src: `/api/clubs/${club.slug}/logo`,
                  sizes: logoSize,
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
            ...(logoSize ? {} : { purpose: "maskable" }),
          },
        ];

        const body = {
          id: `/app/${club.slug}`,
          name: club.name,
          short_name: club.name,
          description: `${club.name} en PoolClubs.`,
          lang: "es",
          start_url: `/app/${club.slug}`,
          // Scope is /app, wider than start_url, which a manifest is allowed to
          // do — scope only has to contain start_url. It has to be wider: the
          // auth guard redirects to /app/login and the club picker to
          // /app/select-club, and under a /app/<slug> scope both of those count
          // as leaving the app, so an installed PWA launching without a valid
          // session cookie dropped straight into the browser and the standalone
          // window showed nothing at all.
          //
          // ponytail: `id` is what keeps two club PWAs apart now that they share
          // a scope, and Chrome below 96 ignores it — on a tablet that old, a
          // second club installed over the first. Fine for a tablet that lives
          // on one club's rail. Upgrade path if that stops being true: move
          // login and the picker under /app/<slug>/ and narrow this back.
          scope: "/app",
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
