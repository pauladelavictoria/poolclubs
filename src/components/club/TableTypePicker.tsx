import { TABLE_TYPES, type TableType } from "@/types";
import { useT } from "@/i18n";
import { TableTypeGlyph } from "./TableTypeGlyph";

/**
 * The cue sport a table is built for — a `role="radiogroup"` of five, same
 * shape as ClubThemePicker's ball swatches, with a proportion-preview
 * rectangle standing in for a colour.
 */
export default function TableTypePicker({
  value,
  onChange,
  disabled,
}: {
  value: TableType | null;
  onChange: (type: TableType) => void;
  disabled?: boolean;
}) {
  const { t } = useT();

  return (
    <div
      role="radiogroup"
      aria-label={t("tables.type")}
      className="grid grid-cols-3 gap-2 sm:grid-cols-5"
    >
      {TABLE_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          role="radio"
          aria-checked={value === type}
          disabled={disabled}
          onClick={() => onChange(type)}
          className={[
            "flex flex-col items-center gap-1.5 rounded-control border p-2",
            "transition-colors duration-150",
            value === type
              ? "border-strike bg-strike-tint text-strike"
              : "border-hairline text-ink-soft hover:border-hairline-strong",
            "disabled:cursor-not-allowed disabled:opacity-50",
          ].join(" ")}
        >
          <TableTypeGlyph type={type} />
          <span className="text-caption">{t(`tables.type.${type}`)}</span>
        </button>
      ))}
    </div>
  );
}
