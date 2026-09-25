import { Select } from "@/components/ui/Select";
import { countryName } from "@/libs/algorithms/geocode";
import { useT } from "@/i18n";

/**
 * SVGs from `flag-icons` (lipis, MIT) rather than emoji: emoji flags don't
 * render as flags on Windows without extra fonts installed, and Windows is
 * exactly what the streaming overlay's own encoder PCs are expected to run
 * (see docs/youtube-streaming.md's ops runbook, which steers clubs toward an
 * NVENC/QuickSync mini PC) — a flag emoji there shows as the bare two-letter
 * code instead.
 *
 * Every two-letter flag in the package, as URLs. `no-inline` so none of them
 * lands in the JS as a data URI: the bundle carries ~250 short paths, and a
 * browser only ever fetches the flags actually on screen. The `??` pattern
 * skips the package's regional extras (es-ct, gb-sct…), which are not ISO
 * codes and would fail the `people_country_shape` CHECK anyway.
 */
const FLAGS: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>("/node_modules/flag-icons/flags/4x3/??.svg", {
      query: "?url&no-inline",
      import: "default",
      eager: true,
    }),
  ).map(([path, url]) => [path.slice(-6, -4).toUpperCase(), url]),
);

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

/** Every country there is a flag for, named in the reader's language and
 *  sorted by that name. Empty means none — a flag is never guessed. */
export function CountrySelect({
  value,
  onChange,
  ...props
}: {
  value: string | null;
  onChange: (country: string | null) => void;
  id?: string;
  disabled?: boolean;
}) {
  const { t, locale } = useT();
  const options = Object.keys(FLAGS)
    .map((code) => [code, countryName(code, locale)] as const)
    .sort((a, b) => a[1].localeCompare(b[1], locale));

  return (
    <Select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      {...props}
    >
      <option value="">{t("players.noCountry")}</option>
      {options.map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </Select>
  );
}
