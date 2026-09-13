import { footprintOf } from "@/libs/algorithms/tableFloorPlan";
import { TABLE_SIZES_BY_TYPE, TABLE_TYPES, type TableType } from "@/types";
import { useT } from "@/i18n";

/** A plain rectangle, proportioned to the type's biggest standard size — a
 *  snooker table reads long and narrow next to pool's squarer box, which
 *  says more at a glance than any label would. Drawn from the largest size
 *  rather than the smallest: it is the shape people picture when they hear
 *  the sport's name. */
function TypeGlyph({ type }: { type: TableType }) {
  const biggest = TABLE_SIZES_BY_TYPE[type].at(-1)!;
  const { lengthMm, widthMm } = footprintOf(type, biggest);
  const w = 36;
  const h = (w * widthMm) / lengthMm;
  return (
    <svg
      viewBox={`0 0 ${w} ${Math.max(h, w * 0.35)}`}
      className="h-6 w-9"
      aria-hidden
    >
      <rect
        x={0}
        y={(Math.max(h, w * 0.35) - h) / 2}
        width={w}
        height={h}
        rx={2}
        fill="var(--color-felt-raised)"
        stroke="currentColor"
        strokeWidth={1.5}
      />
    </svg>
  );
}

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
          <TypeGlyph type={type} />
          <span className="text-caption">{t(`tables.type.${type}`)}</span>
        </button>
      ))}
    </div>
  );
}
