import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * GIF search for comments, on the server.
 *
 * Server-side for the key: Klipy takes it as a path segment, and a VITE_ key
 * would ship in the bundle for anyone to spend. Same shape as searchPlaces —
 * a failure is an empty grid, never an error the reader can do nothing about.
 *
 * Klipy rather than Giphy or Tenor: Tenor's API shut down in June 2026, and
 * Giphy's free tier is rate-limited to a demo. Klipy asks for attribution,
 * which the picker shows.
 */

const KLIPY = "https://api.klipy.com/api/v1";

/** What the grid opens on before anyone types: this is a pool app, so pool
 *  rather than whatever is trending. */
// ponytail: one fixed term; rotate pool/snooker/8-ball if the grid feels stale
const DEFAULT_Q = "billiards";

/** Only GIFs from Klipy's CDN may be stored — mirrored by a CHECK on
 *  comments.gif_url in sql/schema.sql. */
export const GIF_HOST = "https://static.klipy.com/";

export type Gif = { id: number; url: string; preview: string };

type KlipyFormat = { url: string };
type KlipyItem = {
  id: number;
  type: "gif" | "ad";
  file?: Record<"hd" | "md" | "sm" | "xs", { gif?: KlipyFormat }>;
};

export const searchGifs = createServerFn({ method: "GET" })
  .validator(z.object({ q: z.string().trim().max(50) }))
  .handler(async ({ data }): Promise<Gif[]> => {
    const key = process.env.KLIPY_API_KEY;
    if (!key) return [];

    const url = new URL(`${KLIPY}/${encodeURIComponent(key)}/gifs/search`);
    url.searchParams.set("q", data.q || DEFAULT_Q);
    url.searchParams.set("per_page", "24");
    url.searchParams.set("customer_id", "poolclubs");
    url.searchParams.set("content_filter", "medium");

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return [];
      const body = (await res.json()) as { data?: { data?: KlipyItem[] } };
      return (body.data?.data ?? []).flatMap((item) => {
        // Klipy interleaves sponsored items; a comment thread carries none.
        if (item.type !== "gif") return [];
        const url = item.file?.md?.gif?.url ?? item.file?.hd?.gif?.url;
        const preview =
          item.file?.sm?.gif?.url ?? item.file?.xs?.gif?.url ?? url;
        if (!url?.startsWith(GIF_HOST) || !preview) return [];
        return [{ id: item.id, url, preview }];
      });
    } catch {
      return [];
    }
  });
