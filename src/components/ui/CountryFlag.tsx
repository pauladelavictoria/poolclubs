import { FLAGS } from "./flags";
/** A person's own flag, or nothing at all for a country with no flag —
 *  never a broken image or a text fallback. The default is sized and spaced
 *  to sit after a name in running text. */
export function CountryFlag({
  country,
  className = "ml-1.5 inline-block h-[0.75em] w-[1em] shrink-0 rounded-[2px] align-baseline",
}: {
  country?: string | null;
  className?: string;
}) {
  const src = country ? FLAGS[country] : undefined;
  if (!src) return null;

  return <img src={src} alt="" className={`${className} object-cover`} />;
}
