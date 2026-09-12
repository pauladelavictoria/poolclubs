import { toast } from "react-toastify";
import { LuTrash2, LuUndo2 } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useClubTables, useManageClubTables } from "@/hooks/useClubTables";
import { useTableFloorPlanEditor } from "@/hooks/useTableFloorPlanEditor";
import { dbErrorMessage } from "@/libs/algorithms/dbError";
import {
  footprintOf,
  mmToUnits,
  rotateHandlePoint,
  type AlignGuide,
  type SpacingGuide,
  type TablePlacement,
} from "@/libs/algorithms/tableFloorPlan";
import TableFloorPlanSvg from "@/components/club/TableFloorPlanSvg";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { SkeletonRows } from "@/components/ui/Skeleton";
import type { ClubTable } from "@/types";
import { useT } from "@/i18n";

const TRAY_CHIP_CLASSES = [
  "flex shrink-0 cursor-grab touch-none items-center gap-1.5 rounded-control",
  "border border-hairline px-2.5 py-1.5 text-caption text-ink-soft",
  "transition-colors duration-150 active:cursor-grabbing",
].join(" ");

/** A stable empty array for while the query has no data yet. `tables ?? []`
 *  would allocate a fresh array every render, and useTableFloorPlanEditor's
 *  resync compares that reference against the last one it saw — a new array
 *  each render means "the data changed" every time, which re-triggers
 *  setState every render and locks the page into React's max-render-depth
 *  error before it ever finishes loading. */
const NO_TABLES: ClubTable[] = [];

/** Where the selected table's rotate handle sits, drawn as a small ring with
 *  a spoke back to the table's own centre — the only rotate affordance in
 *  the app, so it has to read as "drag this" on its own. */
function RotateHandle({ table }: { table: TablePlacement }) {
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

/** A dashed preview of the table in flight, at the pointer's current spot —
 *  what commitSpawn is about to drop, drawn before it lands. */
function SpawnGhost({
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

/** Alignment guides' own colour — deliberately not var(--color-strike):
 *  that's already the selection outline and the rotate handle, and a guide
 *  has to read as a different kind of thing (a hint about a sibling table)
 *  from "this is what's selected". Design tools converge on some shade of
 *  magenta for exactly this reason — it doesn't occur naturally in the felt
 *  or the ink tokens either theme uses, so it never blends in. */
const ALIGN_GUIDE_COLOR = "#ff2fa0";
/** Spacing guides' own colour — a different hue from alignment (cyan
 *  against magenta), so "this lines up with something" and "this gap now
 *  matches another gap" read as the two distinct claims they are, at a
 *  glance, without having to read which shape the guide draws. */
const SPACING_GUIDE_COLOR = "#00c2ff";
/** Half-length of the little perpendicular tick at each end of a spacing
 *  guide, in grid units — a plain line reads as "these two things are
 *  connected"; the ticks are what makes it read as "these two distances are
 *  the same length", the way a ruler's end marks do. */
const SPACING_TICK_UNITS = 0.6;

/** The alignment and equal-spacing hints from the current drag — see
 *  tableFloorPlan.ts's alignSnap/spacingSnap for what each one means.
 *  Rendered last (as TableFloorPlanSvg's children), so a guide is always on
 *  top of the tables it's pointing at. */
function GuideLines({
  align,
  spacing,
}: {
  align: AlignGuide[];
  spacing: SpacingGuide[];
}) {
  return (
    <g style={{ pointerEvents: "none" }}>
      {align.map((g, i) => (
        <line
          key={`align-${i}`}
          x1={g.axis === "x" ? g.at : g.from}
          y1={g.axis === "x" ? g.from : g.at}
          x2={g.axis === "x" ? g.at : g.to}
          y2={g.axis === "x" ? g.to : g.at}
          stroke={ALIGN_GUIDE_COLOR}
          strokeWidth={0.1}
          strokeDasharray="0.6 0.5"
        />
      ))}
      {spacing.map((g, i) => (
        <g key={`spacing-${i}`}>
          {[g.gapA, g.gapB].map(([from, to], j) => (
            <g key={j}>
              <line
                x1={g.axis === "x" ? from : g.cross}
                y1={g.axis === "x" ? g.cross : from}
                x2={g.axis === "x" ? to : g.cross}
                y2={g.axis === "x" ? g.cross : to}
                stroke={SPACING_GUIDE_COLOR}
                strokeWidth={0.1}
              />
              {[from, to].map((at, k) => (
                <line
                  key={k}
                  x1={g.axis === "x" ? at : g.cross - SPACING_TICK_UNITS}
                  y1={g.axis === "x" ? g.cross - SPACING_TICK_UNITS : at}
                  x2={g.axis === "x" ? at : g.cross + SPACING_TICK_UNITS}
                  y2={g.axis === "x" ? g.cross + SPACING_TICK_UNITS : at}
                  stroke={SPACING_GUIDE_COLOR}
                  strokeWidth={0.1}
                />
              ))}
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}

/**
 * The room, drawn to scale. An admin drags each table from the "not yet
 * placed" tray onto a plain grid, then drags and rotates it to match the
 * real floor — see useTableFloorPlanEditor for the interaction state and
 * tableFloorPlan.ts for the geometry, including the rotate gesture design
 * (there is no precedent for one anywhere else in the app).
 *
 * Nothing here reaches the database until Save: dragging on a club tablet is
 * exactly the case a write-per-pointermove would hurt most.
 */
export default function ClubFloorPlanEditor() {
  const { t } = useT();
  const { activeClubId } = useAuth();
  const { data: tables, isLoading } = useClubTables();
  const { saveTableLayout } = useManageClubTables();
  const editor = useTableFloorPlanEditor(tables ?? NO_TABLES);

  const labels = Object.fromEntries(
    (tables ?? []).map((table) => [table.id, table.label]),
  );

  const selected = editor.placed.find((t) => t.id === editor.selectedId);

  // Reassign targets: every other table, split by whether it already has a
  // spot on the floor plan — picking one from the "already placed" group
  // vacates its old spot rather than swapping the two (see the hook's
  // reassign for why a swap isn't what this does).
  const placedIds = new Set(editor.placed.map((t) => t.id));
  const otherTables = (tables ?? []).filter((t) => t.id !== editor.selectedId);
  const unplacedTargets = otherTables.filter((t) => !placedIds.has(t.id));
  const placedTargets = otherTables.filter((t) => placedIds.has(t.id));

  const save = () => {
    // Belt and suspenders alongside the Save button's own disabled state:
    // there is nowhere in the database to write an unconfirmed placement's
    // position, since it has no table id of its own.
    if (editor.hasUnconfirmed) return;
    const byId = new Map(editor.placed.map((t) => [t.id, t]));
    const payload = (tables ?? []).map((table) => {
      const p = byId.get(table.id);
      return {
        id: table.id,
        mapX: p?.x ?? null,
        mapY: p?.y ?? null,
        mapRotation: p?.rotationDeg ?? null,
      };
    });
    saveTableLayout.mutate(payload, {
      onSuccess: () => editor.markSaved(),
      onError: (err) =>
        toast.error(
          t(
            dbErrorMessage(err, "saveTableLayout", {
              denied: "common.deniedError",
            }),
          ),
        ),
    });
  };

  if (!activeClubId) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader title={t("tables.map.title")} />
      <p className="px-4 text-body text-ink-soft">{t("tables.map.hint")}</p>

      {isLoading ? (
        <div className="p-3">
          <SkeletonRows />
        </div>
      ) : (
        <>
          {editor.unplaced.length > 0 && (
            <div className="flex flex-wrap gap-2 p-4">
              <span className="w-full text-caption text-ink-faint">
                {t("tables.map.unplacedTitle")}
              </span>
              {editor.unplaced.map((table) => (
                <button
                  key={table.id}
                  type="button"
                  className={TRAY_CHIP_CLASSES}
                  title={t("tables.map.dragToPlaceHint")}
                  onPointerDown={(e) => editor.startSpawn(e, table)}
                  onPointerMove={editor.moveSpawn}
                  onPointerUp={editor.commitSpawn}
                  onPointerCancel={editor.cancelSpawn}
                >
                  {table.label}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-hairline p-4">
            <TableFloorPlanSvg
              svgRef={editor.svgRef}
              tables={editor.placed}
              labels={labels}
              selectedId={editor.selectedId}
              viewBox={editor.view}
              className="h-[32rem] w-full rounded-card bg-pocket"
              onPointerDown={editor.handlePointerDown}
              onPointerMove={editor.handlePointerMove}
              onPointerUp={editor.handlePointerUp}
            >
              <GuideLines
                align={editor.guides.align}
                spacing={editor.guides.spacing}
              />
              {selected && <RotateHandle table={selected} />}
              {editor.spawn?.pos && (
                <SpawnGhost table={editor.spawn.table} at={editor.spawn.pos} />
              )}
            </TableFloorPlanSvg>
          </div>

          {editor.hasUnconfirmed && (
            // accent-red, not strike: this matches the "?" rectangle's own
            // colour on the canvas, not the app's action colour — the point
            // is "something needs fixing", not "click here".
            <p className="border-t border-hairline px-4 py-2 text-caption text-accent-red">
              {t("tables.map.unconfirmedBlockSave")}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-hairline p-3">
            <IconButton
              label={t("tables.map.undo")}
              onClick={editor.undo}
              disabled={!editor.canUndo}
            >
              <LuUndo2 className="h-4 w-4" aria-hidden />
            </IconButton>
            {editor.selectedId != null && (
              <>
                <IconButton
                  label={t("tables.map.removeFromMap")}
                  tone="danger"
                  onClick={() => editor.removeFromMap(editor.selectedId!)}
                >
                  <LuTrash2 className="h-4 w-4" aria-hidden />
                </IconButton>
                {otherTables.length > 0 && (
                  <Select
                    size="sm"
                    className="w-auto"
                    aria-label={t("tables.map.reassignTo")}
                    // Always reset to the placeholder: like ClubTablesCard's
                    // "copy from" picker, this is a one-shot action on the
                    // selected rectangle, not a binding that would need to
                    // keep showing which table it last picked.
                    value=""
                    onChange={(e) => {
                      if (e.target.value)
                        editor.reassign(Number(e.target.value));
                    }}
                  >
                    <option value="" disabled>
                      {t("tables.map.reassignPlaceholder")}
                    </option>
                    {unplacedTargets.length > 0 && (
                      <optgroup label={t("tables.map.unplacedTitle")}>
                        {unplacedTargets.map((table) => (
                          <option key={table.id} value={table.id}>
                            {table.label}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {placedTargets.length > 0 && (
                      <optgroup label={t("tables.map.placedTitle")}>
                        {placedTargets.map((table) => (
                          <option key={table.id} value={table.id}>
                            {table.label}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </Select>
                )}
              </>
            )}
            <span className="ml-auto" />
            <Button
              onClick={save}
              disabled={
                !editor.hasChanges ||
                saveTableLayout.isPending ||
                editor.hasUnconfirmed
              }
            >
              {t("tables.map.save")}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
