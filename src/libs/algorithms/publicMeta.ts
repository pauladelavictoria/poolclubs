/**
 * The head tags a shared link needs, in one place.
 *
 * Every public route's `head` calls this. Written as one helper rather than
 * spelled out nine times because the failure mode is silent: a page missing
 * og:url still renders perfectly and only looks broken in somebody else's chat
 * app, which is not a place we can see.
 *
 * Absolute URLs throughout. A crawler fetching og:image resolves it against
 * nothing, so a leading-slash path is a broken image in the card — which is why
 * `origin` is threaded down from the root route's context (readOrigin()) instead
 * of read from `window`, which does not exist while this runs.
 */

/** Fallback card art per section, for entities with no image of their own. Real
 *  1200×630 files still to be added — until they are, these 404 and the crawler
 *  falls back to no image, which is the same as omitting the tag. */
type OgFallback =
  "default" | "clubs" | "players" | "tournaments" | "drills";

const FALLBACK_IMAGE: Record<OgFallback, string> = {
  /** The pages that are not a section of the directory: the landing page and the
   *  prose pages (pricing, about, contact, legal). */
  default: "/og/default.png",
  clubs: "/og/clubs.png",
  players: "/og/players.png",
  tournaments: "/og/tournaments.png",
  drills: "/og/drills.png",
};

/** Long descriptions are truncated by every preview renderer anyway, and a
 *  sentence cut mid-word reads as a bug rather than a limit. */
const MAX_DESCRIPTION = 200;

const clamp = (text: string) => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= MAX_DESCRIPTION) return clean;
  const cut = clean.slice(0, MAX_DESCRIPTION);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : cut.length)}…`;
};

export function publicMeta({
  title,
  description,
  path,
  origin,
  image,
  fallback,
}: {
  /** The document title. Already includes " · PoolClubs" if it wants it. */
  title: string;
  description: string;
  /** Root-relative, with the leading slash: "/clubs/paulas-pool". */
  path: string;
  origin: string;
  /** The entity's own image — a club logo or a player avatar. A data: URI is
   *  skipped: uploaded avatars are stored inline, and no crawler will fetch one. */
  image?: string | null;
  fallback: OgFallback;
}) {
  const url = `${origin}${path}`;
  const ownImage = image && !image.startsWith("data:") ? image : null;
  const imageUrl = ownImage
    ? ownImage.startsWith("http")
      ? ownImage
      : `${origin}${ownImage}`
    : `${origin}${FALLBACK_IMAGE[fallback]}`;
  const clamped = clamp(description);

  return [
    { title },
    { name: "description", content: clamped },
    { property: "og:site_name", content: "PoolClubs" },
    { property: "og:title", content: title },
    { property: "og:description", content: clamped },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:image", content: imageUrl },
    // summary_large_image only pays off with a wide card. A club logo is square,
    // so it gets the small one and fills it rather than being letterboxed.
    {
      name: "twitter:card",
      content: ownImage ? "summary" : "summary_large_image",
    },
  ];
}

/** The canonical link, kept apart because `head` takes links and meta in
 *  separate arrays. */
export const canonical = (path: string, origin: string) => [
  { rel: "canonical", href: `${origin}${path}` },
];
