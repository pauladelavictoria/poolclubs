/**
 * What every link-preview route shares — the four under routes/api/og differ
 * only in what they read and which card they draw.
 *
 * Drawn per request and cached rather than stored: storing meant a card only
 * existed once somebody's browser had drawn it, and a correction afterwards
 * left the old picture in place. ~100ms once, then it sits in the CDN.
 *
 * Anything at all going wrong falls back to the app's default card: a link
 * that previews the wrong picture is a disappointment, one that previews a
 * broken image is a bug.
 */
import { getSupabaseServer } from "@/libs/supabase/server";
import { PERSON_COLS, PLAYER_COLS } from "@/queries/public/shared";
import type { RenderedCard } from "@/libs/server/cardImage";

/** An hour on the visitor's side, a day on the CDN's. What changes a card
 *  sooner is the `v` cache-buster on the page's meta tag, not this. */
const CACHE = "public, max-age=3600, s-maxage=86400";

type Supabase = ReturnType<typeof getSupabaseServer>;

export type OgContext = {
  /** The id or slug in the URL, with any ".png" taken off. */
  key: string;
  supabase: Supabase;
  /** The renderer, imported on demand: it carries three fonts inlined as
   *  base64, and no page's server render should have to parse them. */
  cardImage: typeof import("@/libs/server/cardImage");
  /** Wide is the link preview's 1.91:1; square is what a phone shares into
   *  WhatsApp and Instagram — one renderer, so the share button is a fetch. */
  size: "square" | "wide";
  /** The app's ball mark, from our own origin. */
  markUrl: string;
};

/**
 * A GET handler for one card. `draw` returns null for "nothing to show" —
 * a private club, a missing row — which previews the default card, the same
 * as an error does.
 *
 * The key is a splat with the extension off where the route has one: the
 * router would name a `$id.png` param after the whole segment and warn on
 * every boot that "id.png" is not an identifier.
 */
export const ogHandler =
  (draw: (ctx: OgContext) => Promise<RenderedCard | null>) =>
  async ({
    params,
    request,
  }: {
    params: { _splat?: string; slug?: string };
    request: Request;
  }) => {
    const fallback = () =>
      Response.redirect(new URL("/og/default.png", request.url), 302);

    const url = new URL(request.url);
    const key = String(params._splat ?? params.slug ?? "").replace(
      /\.png$/,
      "",
    );
    if (!key) return fallback();

    try {
      const card = await draw({
        key,
        supabase: getSupabaseServer(),
        cardImage: await import("@/libs/server/cardImage"),
        size: url.searchParams.get("size") === "square" ? "square" : "wide",
        markUrl: `${url.origin}/ball.png`,
      });
      if (!card) return fallback();
      return new Response(card.bytes, {
        headers: { "content-type": card.contentType, "cache-control": CACHE },
      });
    } catch {
      return fallback();
    }
  };

/** Names and faces for these player rows, which live on their person. */
export async function peopleOf(supabase: Supabase, ids: number[]) {
  const { data } = await supabase
    .from("players")
    .select(`${PLAYER_COLS}, person:people(${PERSON_COLS})`)
    .in("id", ids);
  return new Map(
    (data ?? []).map((row) => [
      row.id,
      row.person as { name?: string; avatar_url?: string } | null,
    ]),
  );
}
