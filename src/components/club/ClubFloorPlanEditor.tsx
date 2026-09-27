import { toast } from "react-toastify";
import { LuTrash2, LuUndo2 } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useClubTables, useManageClubTables } from "@/hooks/useClubTables";
import { useTableFloorPlanEditor } from "@/hooks/useTableFloorPlanEditor";
import { dbErrorMessage } from "@/libs/algorithms/dbError";
import TableFloorPlanSvg from "@/components/club/TableFloorPlanSvg";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import { Button, IconButton } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { SkeletonRows } from "@/components/ui/SkeletonRows";
import type { ClubTable } from "@/types";
import { useT } from "@/i18n";
import { FloorPlanRotateHandle } from "./FloorPlanRotateHandle";
import { FloorPlanSpawnGhost } from "./FloorPlanSpawnGhost";
import { FloorPlanGuideLines } from "./FloorPlanGuideLines";

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
      onError: (err) => toast.error(t(dbErrorMessage(err, "saveTableLayout"))),
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
              <FloorPlanGuideLines
                align={editor.guides.align}
                spacing={editor.guides.spacing}
              />
              {selected && <FloorPlanRotateHandle table={selected} />}
              {editor.spawn?.pos && (
                <FloorPlanSpawnGhost
                  table={editor.spawn.table}
                  at={editor.spawn.pos}
                />
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
