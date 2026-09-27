import { footprintOf } from "@/libs/algorithms/tableFloorPlan";
import { TABLE_SIZES_BY_TYPE, type TableType } from "@/types";

/** A plain rectangle, proportioned to the type's biggest standard size — a
 *  snooker table reads long and narrow next to pool's squarer box, which
 *  says more at a glance than any label would. Drawn from the largest size
 *  rather than the smallest: it is the shape people picture when they hear
 *  the sport's name. */
export function TableTypeGlyph({ type }: { type: TableType }) {
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
