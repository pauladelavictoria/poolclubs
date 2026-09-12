import esFlag from "flag-icons/flags/4x3/es.svg?url";

/**
 * SVGs from `flag-icons` (lipis, MIT) rather than emoji: emoji flags don't
 * render as flags on Windows without extra fonts installed, and Windows is
 * exactly what the streaming overlay's own encoder PCs are expected to run
 * (see docs/youtube-streaming.md's ops runbook, which steers clubs toward an
 * NVENC/QuickSync mini PC) — a flag emoji there shows as the bare two-letter
 * code instead. Imported one file at a time rather than the package's full
 * CSS sprite, so only the countries actually in use ship in the bundle. Add
 * a country here as one is actually needed.
 */
const FLAGS: Record<string, string> = {
  ES: esFlag,
};

/** A person's own flag, or nothing at all for a country not in FLAGS above —
 *  never a broken image or a text fallback. */
export function CountryFlag({
  country,
  className = "h-[1em] w-[1.5em]",
}: {
  country?: string | null;
  className?: string;
}) {
  const src = country ? FLAGS[country] : undefined;
  if (!src) return null;

  return <img src={src} alt="" className={`${className} object-cover`} />;
}
