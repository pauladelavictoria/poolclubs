import { footprintOf, mmToUnits } from "@/libs/algorithms/tableFloorPlan";
import type { ClubTable } from "@/types";

/** A dashed preview of the table in flight, at the pointer's current spot —
 *  what commitSpawn is about to drop, drawn before it lands. */
export function FloorPlanSpawnGhost({
  table,
  at,
}: {
  table: ClubTable;
  at: { x: number; y: number };
}) {
  const { lengthMm, widthMm } = footprintOf(table.type, table.size);
  const w = mmToUnits(lengthMm);
  const h = mmToUnits(widthMm);
  return (
    <rect
      x={at.x - w / 2}
      y={at.y - h / 2}
      width={w}
      height={h}
      rx={Math.min(w, h) * 0.08}
      // Matches the real tables' own fill (see TableFloorPlanSvg) so a
      // table in flight previews as the same shape it'll land as.
      fill="var(--color-rail)"
      fillOpacity={0.6}
      stroke="var(--color-strike)"
      strokeDasharray="0.4 0.3"
      strokeWidth={0.1}
    />
  );
}
