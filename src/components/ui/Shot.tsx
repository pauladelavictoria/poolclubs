/**
 * An image slot for the public side, two states:
 *
 *   1. a real file in the SHOTS registry — the custom illustration, once it exists
 *   2. no file — a reserved box (or nothing, with `fallback="none"`)
 *
 * There was a third state: a picsum seed standing in for artwork that did not
 * exist yet. It is gone. Random stock photography told the reader nothing, and
 * under a club's name it actively lied about whose room they were looking at.
 * Every surface it used to fill now draws real objects instead — the rack, the
 * discipline balls, a wall of real member faces.
 *
 * The ratio is reserved in both states, so dropping real artwork in never moves
 * the layout: width/height attributes are emitted alongside aspect-ratio, so the
 * box exists before CSS parses.
 *
 * Drop files into `public/art/` and register them below to promote a slot from
 * empty to real artwork — nothing else about a call site changes.
 *
 * The product shots there came from scripts/screenshots.mjs, in Spanish, and
 * every slot reserves the shot's own ratio so `object-cover` has nothing to
 * crop. Promoting a new one is: pick it out of screenshots/{light,dark}/es,
 * `sips -Z 2000` it down, register it here, and pass its size at the call site.
 */
const SHOTS: Record<string, string> = {
  // The landing hero: a device mockup rather than a screenshot, and the one
  // entry that must not be framed — it carries its own transparent background
  // and its own shadows. Its twin below swaps the bezels rather than the app
  // inside them. Both are cropped to one shared alpha bounding box so the pair
  // is the same size, which is what lets a single `size` reserve the box for
  // either — see the call site in LandingPage.
  hero: "/art/poolclubs-hero.png",

  // LandingPage's four, carried over from its local Shot.
  phone: "/art/phone.png",
  ranking: "/art/ranking.png",
  drill: "/art/drill.png",
  challenge: "",

  // LandingPage's tour, one screen each. `club` is a jpeg and the rest are
  // pngs: it is the only one of them photographic (the club's own photos and a
  // map tile), and as a png it weighed more than the other three together.
  tournament: "/art/tournament.png",
  tv: "/art/tv.png",
  me: "/art/me.png",
  club: "/art/club.jpg",

  // Empty states, 1/1.
  "empty-clubs": "",
  "empty-players": "",
  "empty-tournaments": "",
  "empty-drills": "",
  "empty-search": "",

  // Decorative, `fallback="none"` at every call site: nothing shows until
  // these exist, rather than a dashed box standing in for a flourish.
  "player.flourish": "",
  "drill.flourish": "",
};

/**
 * The dark-theme twin of a shot, where one exists.
 *
 * A screenshot cannot be theme-agnostic the way a drawing can: the light one on
 * a dark page is a white rectangle in the middle of the room. Both are rendered
 * and CSS picks, because the theme is a `data-theme` attribute set from a
 * cookie, not `prefers-color-scheme` — so `<picture>` and a media query would
 * answer the wrong question.
 */
const SHOTS_DARK: Record<string, string> = {
  hero: "/art/poolclubs-hero-dark.png",
  phone: "/art/phone-dark.png",
  ranking: "/art/ranking-dark.png",
  drill: "/art/drill-dark.png",
  tournament: "/art/tournament-dark.png",
  tv: "/art/tv-dark.png",
  me: "/art/me-dark.png",
  club: "/art/club-dark.jpg",
};

export function Shot({
  name,
  alt,
  size,
  className = "",
  priority = false,
  fallback = "frame",
}: {
  /** Key into SHOTS. Also the label shown in the dev placeholder frame, so an
   *  arbitrary per-entity name (e.g. `club-${club.id}`) is fine even though it
   *  will never match a registry entry. */
  name: keyof typeof SHOTS | (string & {});
  alt: string;
  /** Pixel size: reserves the box (width/height + aspect-ratio). */
  size: readonly [number, number];
  className?: string;
  /** Heroes only: eager + fetchpriority="high" instead of lazy. */
  priority?: boolean;
  /** "none" for decorative flourishes: nothing renders until real art lands,
   *  rather than a dashed box standing in for decoration. */
  fallback?: "frame" | "none";
}) {
  const [w, h] = size;
  const ratio = `${w} / ${h}`;
  const src = SHOTS[name];
  const darkSrc = SHOTS_DARK[name];

  if (src) {
    // Both carry the same alt: the hidden one is `display: none`, which takes it
    // out of the accessibility tree, so exactly one is ever announced.
    const image = (source: string, themeClass = "") => (
      <img
        src={source}
        alt={alt}
        width={w}
        height={h}
        style={{ aspectRatio: ratio }}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        className={`w-full object-cover ${themeClass} ${className}`}
      />
    );

    if (!darkSrc) return image(src);

    return (
      <>
        {image(src, "theme-light-only")}
        {image(darkSrc, "theme-dark-only")}
      </>
    );
  }

  if (fallback === "none") return null;

  // Live visitors should never see a labelled placeholder: this is a build-time
  // reminder, not production UI. Everywhere the SHOTS registry is still empty
  // and no seed was given, production just gets a quiet reserved box.
  if (import.meta.env.DEV) {
    return (
      <div
        style={{ aspectRatio: ratio }}
        role="img"
        aria-label={alt}
        className={`flex w-full items-center justify-center border border-dashed border-hairline-strong bg-felt/60 ${className}`}
      >
        <span className="px-4 text-center font-mono text-caption text-ink-ghost">
          {name}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{ aspectRatio: ratio }}
      role="img"
      aria-label={alt}
      className={`w-full bg-felt/40 ${className}`}
    />
  );
}
