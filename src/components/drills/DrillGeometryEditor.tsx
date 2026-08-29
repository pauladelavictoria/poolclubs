import type { Dispatch, SetStateAction } from "react";
import { LuMoveRight, LuTrash2, LuUndo2 } from "react-icons/lu";
import PoolTableDiagram from "@/components/drills/PoolTableDiagram";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BallGlyph } from "@/components/ui/Ball";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import {
  BALLS,
  BALL_COLORS,
  LABEL_TAGS,
  snap,
} from "@/libs/algorithms/drillGeometry";
import {
  ARROW_SPAWN_LENGTH,
  BALL_RADIUS,
  useDrillGeometryEditor,
} from "@/hooks/useDrillGeometryEditor";
import { useTablePortrait } from "@/hooks/useMedia";
import type { BallPosition, ShotPath } from "@/types";
import { useT } from "@/i18n";

type BallEntry = (typeof BALLS)[number];

const PALETTE_ITEM_CLASSES = [
  "h-9 w-9 shrink-0 cursor-grab touch-none rounded-full p-0.5",
  "transition-colors duration-150 active:cursor-grabbing",
].join(" ");

/**
 * The table: a toolbar of balls and an arrow to drag out, the felt itself,
 * and an inspector for whatever is selected. `balls`/`paths` are controlled —
 * DrillForm owns them, since it is what submits them.
 */
export default function DrillGeometryEditor({
  balls,
  setBalls,
  paths,
  setPaths,
}: {
  balls: BallPosition[];
  setBalls: Dispatch<SetStateAction<BallPosition[]>>;
  paths: ShotPath[];
  setPaths: Dispatch<SetStateAction<ShotPath[]>>;
}) {
  const { t } = useT();
  const portrait = useTablePortrait();
  const editor = useDrillGeometryEditor({ balls, setBalls, paths, setPaths });
  const {
    svgRef,
    selected,
    selectedBall,
    selectedPath,
    history,
    spawn,
    ghost,
    pushHistory,
    undo,
    deleteSelected,
    startSpawn,
    moveSpawn,
    commitSpawn,
    cancelSpawn,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    setBallLabel,
    toggleTag,
    setPathType,
  } = editor;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-2 border-b border-hairline p-2">
        {/* Wraps rather than scrolls: a scrolling row of touch-none drag
            sources leaves nowhere to swipe on a phone. */}
        <div className="flex min-w-0 flex-1 flex-wrap gap-1">
          {BALLS.map((entry) => {
            const active =
              selectedBall?.color === entry.color &&
              selectedBall?.label === entry.label;
            return (
              <button
                key={entry.label ?? "cue"}
                type="button"
                aria-label={
                  entry.label
                    ? t("drillForm.ball", { label: entry.label })
                    : t("drillForm.cueBall")
                }
                aria-pressed={active}
                className={[
                  PALETTE_ITEM_CLASSES,
                  // A ring, not a fill: the accent is yellow now and a solid
                  // yellow pad would swallow the yellow ball sitting on it.
                  active
                    ? "bg-rail ring-2 ring-strike"
                    : "hover:bg-felt-raised",
                ].join(" ")}
                onPointerDown={(e) => startSpawn(e, entry)}
                onPointerMove={moveSpawn}
                onPointerUp={commitSpawn}
                onPointerCancel={cancelSpawn}
              >
                <BallGlyph color={entry.color} label={entry.label} />
              </button>
            );
          })}

          <span
            aria-hidden
            className="mx-1 w-px shrink-0 self-stretch bg-hairline"
          />

          <button
            type="button"
            aria-label={t("drillForm.arrow")}
            className={[
              PALETTE_ITEM_CLASSES,
              "flex items-center justify-center text-ink-soft hover:bg-felt-raised hover:text-ink",
            ].join(" ")}
            onPointerDown={(e) => startSpawn(e, "arrow")}
            onPointerMove={moveSpawn}
            onPointerUp={commitSpawn}
            onPointerCancel={cancelSpawn}
          >
            <LuMoveRight className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={history.length === 0}
          >
            <LuUndo2 className="mr-1.5 h-4 w-4" aria-hidden />
            {t("drillForm.undo")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={deleteSelected}
            disabled={!selected}
          >
            <LuTrash2 className="mr-1.5 h-4 w-4" aria-hidden />
            {t("drillForm.erase")}
          </Button>
        </div>
      </div>

      <div className={`mx-auto w-full p-3 ${portrait ? "max-w-[420px]" : ""}`}>
        <PoolTableDiagram
          ballPositions={balls}
          shotPaths={paths}
          portrait={portrait}
          selected={selected}
          svgRef={svgRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {ghost &&
            (spawn!.source === "arrow" ? (
              <line
                x1={ghost.x - ARROW_SPAWN_LENGTH / 2}
                y1={ghost.y}
                x2={ghost.x + ARROW_SPAWN_LENGTH / 2}
                y2={ghost.y}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={0.5}
              />
            ) : (
              <circle
                cx={snap(ghost.x)}
                cy={snap(ghost.y)}
                r={BALL_RADIUS}
                fill={
                  BALL_COLORS[(spawn!.source as BallEntry).color] ??
                  (spawn!.source as BallEntry).color
                }
                opacity={0.6}
              />
            ))}
        </PoolTableDiagram>

        <p className="mt-2 text-caption text-ink-faint">
          {t("drillForm.canvasHint")}
        </p>
      </div>

      {selectedBall && (
        <div className="border-t border-hairline p-3">
          <Label htmlFor="ball-label" className="mb-2">
            {t("drillForm.label")}
          </Label>
          <Input
            id="ball-label"
            value={selectedBall.label ?? ""}
            placeholder={t("drillForm.labelPlaceholder")}
            // Once per edit, not once per keystroke
            onFocus={pushHistory}
            onChange={(e) => setBallLabel(e.target.value || undefined)}
          />

          <div className="mt-2 flex flex-wrap gap-1.5">
            {LABEL_TAGS.map((tag) => {
              const active = selectedBall.label === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={active}
                  className={[
                    "h-8 rounded-control border px-2.5 text-caption font-medium",
                    "transition-colors duration-150",
                    active
                      ? "border-strike bg-strike-tint text-strike"
                      : "border-hairline text-ink-faint hover:text-ink",
                  ].join(" ")}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-caption text-ink-ghost">
            {t("drillForm.labelHint")}
          </p>
        </div>
      )}

      {selectedPath && (
        <div className="flex items-center gap-2 border-t border-hairline p-3">
          <Label htmlFor="path-type">{t("drillForm.path")}</Label>
          <Select
            id="path-type"
            size="sm"
            value={selectedPath.type ?? "solid"}
            onChange={(e) => setPathType(e.target.value as ShotPath["type"])}
          >
            <option value="solid">{t("drillForm.solid")}</option>
            <option value="dashed">{t("drillForm.dashed")}</option>
          </Select>
        </div>
      )}
    </Card>
  );
}
