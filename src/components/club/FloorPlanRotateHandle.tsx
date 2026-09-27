import {
  rotateHandlePoint,
  type TablePlacement,
} from "@/libs/algorithms/tableFloorPlan";
import { useT } from "@/i18n";

/** Where the selected table's rotate handle sits, drawn as a small ring with
 *  a spoke back to the table's own centre — the only rotate affordance in
 *  the app, so it has to read as "drag this" on its own. */
export function FloorPlanRotateHandle({ table }: { table: TablePlacement }) {
  const { t } = useT();
  const p = rotateHandlePoint(table);
  return (
    <g style={{ cursor: "grab" }}>
      {/* The other half of the canvas's only hint: hovering the table says
          "drag to move", hovering this dot says "drag to rotate" — nothing
          else on screen tells a first-time admin the dot does anything. */}
      <title>{t("tables.map.rotateHint")}</title>
      <line
        x1={table.x}
        y1={table.y}
        x2={p.x}
        y2={p.y}
        stroke="var(--color-strike)"
        strokeWidth={0.08}
        strokeDasharray="0.3 0.3"
      />
      <circle
        cx={p.x}
        cy={p.y}
        r={0.9}
        fill="var(--color-strike)"
        stroke="var(--color-pocket)"
        strokeWidth={0.15}
      />
    </g>
  );
}
