import { createFileRoute } from "@tanstack/react-router";

/**
 * A server route rather than a file in public/, for one reason: the Sitemap line
 * has to be an absolute URL, and a static file cannot know the host it is being
 * served from. This reads it off the request, so it is right on a deploy preview
 * and on localhost as well as in production.
 *
 * Same bracket-escaped filename trick as sitemap[.]xml.ts — `[.]` keeps the dot
 * a literal part of the path instead of an extension.
 */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin;

        const body = [
          "User-agent: *",
          "Allow: /",
          "",
          "# Everything under /app needs an account, so a crawler only ever gets",
          "# the login page from it. The public side — /clubs, /players,",
          "# /tournaments, /drills — is what there is to index. /search is",
          "# excluded because a search page per query is the classic way to get a",
          "# site's crawl budget spent on nothing.",
          "Disallow: /app",
          "Disallow: /auth",
          "Disallow: /search",
          "",
          `Sitemap: ${origin}/sitemap.xml`,
          "",
        ].join("\n");

        return new Response(body, {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
