import { useId, type ReactNode, type Ref } from "react";
import {
  footprintOf,
  mmToUnits,
  type TablePlacement,
} from "@/libs/algorithms/tableFloorPlan";
import { useT } from "@/i18n";

const SELECTED_STROKE = "var(--color-strike)";

type ViewBox = { minX: number; minY: number; w: number; h: number };

/**
 * The plain gridded canvas, and every table drawn on it at a size
 * proportional to its real footprint. A dumb renderer with no state of its
 * own — reused by both ClubFloorPlanEditor (pointer handlers passed in) and
 * the public read-only view (none passed, so the grid is just a picture),
 * the same way PoolTableDiagram serves both the interactive drill editor
 * and a plain drill card.
 */
export default function TableFloorPlanSvg({
  tables,
  labels,
  selectedId,
  viewBox,
  className = "",
  svgRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  children,
}: {
  tables: TablePlacement[];
  /** table id -> what's painted on the wall. TablePlacement itself carries
   *  no label: it is the floor plan's own minimal shape, shared as-is with
   *  the public query. */
  labels: Record<number, string>;
  /** Only ever set from the editor — the public view never selects a table,
   *  so it never draws a rotate handle via `children`. */
  selectedId?: number | null;
  viewBox: ViewBox;
  className?: string;
  svgRef?: Ref<SVGSVGElement>;
  onPointerDown?: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove?: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp?: (e: React.PointerEvent<SVGSVGElement>) => void;
  /** Editor-only extras drawn on top: the rotate handle, a spawn ghost. */
  children?: ReactNode;
}) {
  const { t } = useT();
  const gridId = useId();
  const interactive = Boolean(onPointerDown);

  return (
    <svg
      ref={svgRef}
      viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.w} ${viewBox.h}`}
      // select-none: without it, a click-and-hold on a table's label starts
      // a native text selection, and the browser then reads the drag as
      // "move this selected text" instead of a pointer gesture on the svg —
      // the label is the most natural place to grab a table by, so this is
      // not an edge case.
      className={`select-none ${className}`}
      style={interactive ? { touchAction: "none" } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <defs>
        <pattern id={gridId} width={1} height={1} patternUnits="userSpaceOnUse">
          <path
            d="M 1 0 L 0 0 0 1"
            fill="none"
            stroke="var(--color-hairline)"
            strokeWidth={0.03}
          />
        </pattern>
      </defs>
      <rect
        x={viewBox.minX}
        y={viewBox.minY}
        width={viewBox.w}
        height={viewBox.h}
        fill={`url(#${gridId})`}
      />

      {tables.map((table) => {
        const { lengthMm, widthMm } = footprintOf(table.type, table.size);
        const w = mmToUnits(lengthMm);
        const h = mmToUnits(widthMm);
        const selected = table.id === selectedId;
        return (
          <g
            key={table.id}
            transform={`translate(${table.x} ${table.y}) rotate(${table.rotationDeg})`}
            style={interactive ? { cursor: "grab" } : undefined}
          >
            {/* A native tooltip: the one hint a first-time admin gets on
                hover, since nothing else on the canvas says a table is
                draggable at all. Editor-only — the public view has nothing
                to drag. */}
            {interactive && <title>{t("tables.map.moveHint")}</title>}
            <rect
              x={-w / 2}
              y={-h / 2}
              width={w}
              height={h}
              rx={Math.min(w, h) * 0.08}
              fill="var(--color-felt-raised)"
              stroke={
                selected ? SELECTED_STROKE : "var(--color-hairline-strong)"
              }
              strokeWidth={selected ? 0.15 : 0.08}
            />
            {/* Counter-rotated so the label stays upright regardless of the
                table's own facing — the same trick PoolTableDiagram uses to
                keep a ball's number readable on a turned table. */}
            <g transform={`rotate(${-table.rotationDeg})`}>
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--color-ink-soft)"
                fontSize={Math.min(w, h) * 0.32}
              >
                {labels[table.id] ?? ""}
              </text>
            </g>
          </g>
        );
      })}

      {children}
    </svg>
  );
}

export type { ViewBox as TableFloorPlanViewBox };
