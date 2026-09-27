import { Select } from "@/components/ui/Select";
import { countryName } from "@/libs/algorithms/geocode";
import { useT } from "@/i18n";
import { FLAGS } from "./flags";

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
