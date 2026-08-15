/**
 * An image slot for the public side, three states in priority order:
 *
 *   1. a real file in the SHOTS registry — the custom illustration, once it exists
 *   2. a `seed` — a deterministic stock stand-in
 *   3. neither — a reserved box (or nothing, with `fallback="none"`)
 *
 * The ratio is reserved in all three cases, so swapping a stand-in for real
 * artwork never moves the layout: width/height attributes are emitted
 * alongside aspect-ratio, so the box exists before CSS parses.
 *
 * Drop files into `public/art/` and register them below to promote a slot from
 * stock or empty to real artwork — nothing else about a call site changes.
 */
const SHOTS: Record<string, string> = {
  // LandingPage's four, carried over from its local Shot.
  phone: "",
  ranking: "",
  drill: "",
  challenge: "",

  // Page heroes, 16/9.
  "hero-clubs": "",
  "hero-players": "",
  "hero-tournaments": "",
  "hero-drills": "",
  "hero-search": "",

  // CTA band backdrop, 21/9.
  "cta-band": "",

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

/** Deterministic on purpose: the same seed is the same photo forever, so a card
 *  does not reshuffle between the server render and hydration. Grayscale is not
 *  optional: picsum returns random-palette photography, and a teal photo under a
 *  purple club reads as a broken theme. Desaturated under .wash, a random photo
 *  becomes texture wearing the club's hue. */
const stock = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}?grayscale`;

export function Shot({
  name,
  alt,
  size,
  seed,
  className = "",
  priority = false,
  fallback = "frame",
}: {
  /** Key into SHOTS. Also the label shown in the dev placeholder frame, so an
   *  arbitrary per-entity name (e.g. `club-${club.id}`) is fine even though it
   *  will never match a registry entry. */
  name: keyof typeof SHOTS | (string & {});
  alt: string;
  /** Pixel size: reserves the box (width/height + aspect-ratio) and, when
   *  falling back to stock, is the size requested from picsum. */
  size: readonly [number, number];
  /** A stock stand-in, tried after the SHOTS registry and before the
   *  reserved-box fallback. Omit for slots picsum has no business filling
   *  (players, drills — see the plan's imagery constraints). */
  seed?: string;
  className?: string;
  /** Heroes only: eager + fetchpriority="high" instead of lazy. */
  priority?: boolean;
  /** "none" for decorative flourishes: nothing renders until real art lands,
   *  rather than a dashed box standing in for decoration. */
  fallback?: "frame" | "none";
}) {
  const [w, h] = size;
  const ratio = `${w} / ${h}`;
  const src = SHOTS[name] || (seed ? stock(seed, w, h) : "");

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        width={w}
        height={h}
        style={{ aspectRatio: ratio }}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        className={`w-full object-cover ${className}`}
      />
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
