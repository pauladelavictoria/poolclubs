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
 */
const SHOTS: Record<string, string> = {
  // LandingPage's four, carried over from its local Shot.
  phone: "",
  ranking: "",
  drill: "",
  challenge: "",

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
