import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { LuMoveRight, LuTrash2, LuUndo2 } from "react-icons/lu";
import PoolTableDiagram from "@/components/drills/PoolTableDiagram";
import CancelLink from "@/components/layout/CancelLink";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BallGlyph } from "@/components/ui/Ball";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import {
  BALLS,
  BALL_COLORS,
  BALL_RADIUS,
  LABEL_TAGS,
  clampBall,
  hitTest,
  isOnFelt,
  pointToUnits,
  snap,
  type Selection,
} from "@/libs/algorithms/drillGeometry";
import {
  DIFFICULTIES,
  SKILL_TYPES,
  type BallPosition,
  type Drill,
  type DrillDifficulty,
  type DrillSkillType,
  type ShotPath,
} from "@/types";
import type { DrillInput } from "@/hooks/useManageDrills";
import { useTablePortrait } from "@/hooks/useMedia";
import { useT } from "@/i18n";

type BallEntry = (typeof BALLS)[number];
/** What is being dragged out of the toolbar. */
type SpawnSource = BallEntry | "arrow";

/** An arrow dropped from the toolbar starts this long, then you drag its ends. */
const ARROW_SPAWN_LENGTH = 16;
/** Past this many px a press counts as a drag rather than a tap. */
const DRAG_THRESHOLD = 4;
/** Grab radius for a path endpoint; further in and the whole line moves. */
const ENDPOINT_GRAB = 2;
/** Where a tapped item lands when there is no drop point: middle of the felt. */
const FELT_CENTRE = { x: 50, y: 25 };

const PALETTE_ITEM_CLASSES = [
  "h-9 w-9 shrink-0 cursor-grab touch-none rounded-full p-0.5",
  "transition-colors duration-150 active:cursor-grabbing",
].join(" ");

type DrillFormProps = {
  initial?: Drill;
  onSubmit: (values: DrillInput) => void;
  onDelete?: () => void;
  isSubmitting?: boolean;
};

export default function DrillForm({
  initial,
  onSubmit,
  onDelete,
  isSubmitting = false,
}: DrillFormProps) {
  const { t } = useT();
  const portrait = useTablePortrait();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [difficulty, setDifficulty] = useState<DrillDifficulty>(
    initial?.difficulty ?? "beginner",
  );
  const [skillType, setSkillType] = useState<DrillSkillType>(
    initial?.skill_type ?? "potting",
  );
  const [setupInstructions, setSetupInstructions] = useState(
    initial?.setup_instructions ?? "",
  );
  const [scoringMethod, setScoringMethod] = useState(
    initial?.scoring_method ?? "",
  );
  const [maxScore, setMaxScore] = useState(String(initial?.max_score ?? 10));

  const [balls, setBalls] = useState<BallPosition[]>(
    initial?.ball_positions ?? [],
  );
  const [paths, setPaths] = useState<ShotPath[]>(initial?.shot_paths ?? []);

  const [selected, setSelected] = useState<Selection | null>(null);
  const [history, setHistory] = useState<
    { balls: BallPosition[]; paths: ShotPath[] }[]
  >([]);

  /** A toolbar item in flight. `pos` is null while the pointer is off the felt. */
  const [spawn, setSpawn] = useState<{
    source: SpawnSource;
    origin: { x: number; y: number };
    moved: boolean;
    pos: { x: number; y: number } | null;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<
    | null
    | { kind: "ball"; index: number }
    | { kind: "path"; index: number; end: 1 | 2 }
    | { kind: "path-move"; index: number; last: { x: number; y: number } }
  >(null);

  /** Call right before a change, so undo has somewhere to go back to. */
  const pushHistory = () =>
    setHistory((prev) => [...prev.slice(-29), { balls, paths }]);

  const undo = () => {
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (!last) return prev;
      setBalls(last.balls);
      setPaths(last.paths);
      setSelected(null);
      return prev.slice(0, -1);
    });
  };

  const deleteSelected = () => {
    if (!selected) return;
    pushHistory();
    if (selected.kind === "ball")
      setBalls((prev) => prev.filter((_, i) => i !== selected.index));
    else setPaths((prev) => prev.filter((_, i) => i !== selected.index));
    setSelected(null);
  };

  // Delete/Backspace removes the selection, unless a field has focus
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      e.preventDefault();
      deleteSelected();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const unitsAt = (clientX: number, clientY: number) =>
    svgRef.current ? pointToUnits(svgRef.current, clientX, clientY) : null;

  // --- Dragging a new item out of the toolbar -----------------------------

  const startSpawn = (
    e: React.PointerEvent<HTMLButtonElement>,
    source: SpawnSource,
  ) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSpawn({
      source,
      origin: { x: e.clientX, y: e.clientY },
      moved: false,
      pos: null,
    });
  };

  const moveSpawn = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!spawn) return;
    const p = unitsAt(e.clientX, e.clientY);
    const travelled = Math.hypot(
      e.clientX - spawn.origin.x,
      e.clientY - spawn.origin.y,
    );
    setSpawn((prev) =>
      prev
        ? {
            ...prev,
            moved: prev.moved || travelled > DRAG_THRESHOLD,
            pos: p && isOnFelt(p) ? p : null,
          }
        : prev,
    );
  };

  const commitSpawn = () => {
    const flight = spawn;
    setSpawn(null);
    if (!flight) return;

    // A tap drops onto the selected ball if there is one, else the centre
    const fallback =
      flight.source !== "arrow" && selected?.kind === "ball"
        ? balls[selected.index]
        : FELT_CENTRE;
    const target = flight.moved ? flight.pos : fallback;
    if (!target) return; // dragged off the table: nothing to do

    pushHistory();

    if (flight.source === "arrow") {
      const half = ARROW_SPAWN_LENGTH / 2;
      const cx = Math.min(100 - half, Math.max(half, snap(target.x)));
      const cy = snap(target.y);
      setPaths((prev) => [
        ...prev,
        { x1: cx - half, y1: cy, x2: cx + half, y2: cy, type: "solid" },
      ]);
      setSelected({ kind: "path", index: paths.length });
      return;
    }

    // Dropped onto an existing ball, that ball changes suit instead
    const hit = hitTest(balls, [], target);
    if (hit) {
      setBalls((prev) =>
        prev.map((b, i) =>
          i === hit.index
            ? {
                ...b,
                color: (flight.source as BallEntry).color,
                label: (flight.source as BallEntry).label,
              }
            : b,
        ),
      );
      setSelected(hit);
      return;
    }

    setBalls((prev) => [
      ...prev,
      {
        ...clampBall({ x: snap(target.x), y: snap(target.y) }),
        color: (flight.source as BallEntry).color,
        ...((flight.source as BallEntry).label
          ? { label: (flight.source as BallEntry).label }
          : {}),
      },
    ]);
    setSelected({ kind: "ball", index: balls.length });
  };

  // --- Moving what is already on the table --------------------------------

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const p = unitsAt(e.clientX, e.clientY);
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const hit = hitTest(balls, paths, p);
    setSelected(hit);
    if (!hit) return;
    pushHistory();

    if (hit.kind === "ball") {
      drag.current = { kind: "ball", index: hit.index };
      return;
    }
    const path = paths[hit.index];
    const d1 = Math.hypot(p.x - path.x1, p.y - path.y1);
    const d2 = Math.hypot(p.x - path.x2, p.y - path.y2);
    drag.current =
      Math.min(d1, d2) <= ENDPOINT_GRAB
        ? { kind: "path", index: hit.index, end: d1 <= d2 ? 1 : 2 }
        : { kind: "path-move", index: hit.index, last: p };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const active = drag.current;
    if (!active) return;
    const p = unitsAt(e.clientX, e.clientY);
    if (!p) return;

    if (active.kind === "ball") {
      const next = clampBall({ x: snap(p.x), y: snap(p.y) });
      setBalls((prev) =>
        prev.map((b, i) => (i === active.index ? { ...b, ...next } : b)),
      );
      return;
    }

    if (active.kind === "path") {
      const x = snap(p.x);
      const y = snap(p.y);
      setPaths((prev) =>
        prev.map((path, i) =>
          i === active.index
            ? active.end === 1
              ? { ...path, x1: x, y1: y }
              : { ...path, x2: x, y2: y }
            : path,
        ),
      );
      return;
    }

    const dx = p.x - active.last.x;
    const dy = p.y - active.last.y;
    active.last = p;
    setPaths((prev) =>
      prev.map((path, i) =>
        i === active.index
          ? {
              ...path,
              x1: path.x1 + dx,
              y1: path.y1 + dy,
              x2: path.x2 + dx,
              y2: path.y2 + dy,
            }
          : path,
      ),
    );
  };

  const handlePointerUp = () => {
    drag.current = null;
  };

  // --- Inspector ----------------------------------------------------------

  const setBallLabel = (label: string | undefined) => {
    if (selected?.kind !== "ball") return;
    setBalls((prev) =>
      prev.map((b, i) => (i === selected.index ? { ...b, label } : b)),
    );
  };

  const toggleTag = (tag: string) => {
    if (selected?.kind !== "ball") return;
    pushHistory();
    setBallLabel(balls[selected.index].label === tag ? undefined : tag);
  };

  const setPathType = (type: ShotPath["type"]) => {
    if (selected?.kind !== "path") return;
    pushHistory();
    setPaths((prev) =>
      prev.map((path, i) => (i === selected.index ? { ...path, type } : path)),
    );
  };

  const selectedBall =
    selected?.kind === "ball" ? balls[selected.index] : undefined;
  const selectedPath =
    selected?.kind === "path" ? paths[selected.index] : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const score = Number(maxScore);
    if (!name.trim()) return toast.error(t("drillForm.nameRequired"));
    if (!Number.isFinite(score) || score < 1)
      return toast.error(t("drillForm.maxScoreMin"));
    if (balls.length === 0) return toast.error(t("drillForm.needBall"));

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      difficulty,
      skill_type: skillType,
      setup_instructions: setupInstructions.trim(),
      scoring_method: scoringMethod.trim(),
      max_score: score,
      ball_positions: balls,
      shot_paths: paths,
    });
  };

  const ghost = spawn?.pos;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
                  onPointerCancel={() => setSpawn(null)}
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
              onPointerCancel={() => setSpawn(null)}
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

        <div
          className={`mx-auto w-full p-3 ${portrait ? "max-w-[420px]" : ""}`}
        >
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
              (spawn.source === "arrow" ? (
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
                    BALL_COLORS[(spawn.source as BallEntry).color] ??
                    (spawn.source as BallEntry).color
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

      <Card className="overflow-hidden">
        <CardHeader title={t("drillForm.details")} />
        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="drill-name">{t("drillForm.name")}</Label>
            <Input
              id="drill-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="drill-description">
              {t("drillForm.description")}
            </Label>
            <Textarea
              id="drill-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="drill-difficulty">
                {t("drillForm.difficulty")}
              </Label>
              <Select
                id="drill-difficulty"
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value as DrillDifficulty)
                }
                disabled={isSubmitting}
              >
                {DIFFICULTIES.map((key) => (
                  <option key={key} value={key}>
                    {t(`difficulty.${key}`)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex-1 space-y-1.5">
              <Label htmlFor="drill-skill">{t("drillForm.skill")}</Label>
              <Select
                id="drill-skill"
                value={skillType}
                onChange={(e) => setSkillType(e.target.value as DrillSkillType)}
                disabled={isSubmitting}
              >
                {SKILL_TYPES.map((key) => (
                  <option key={key} value={key}>
                    {t(`skill.${key}`)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="drill-setup">{t("drillForm.setup")}</Label>
            <Textarea
              id="drill-setup"
              value={setupInstructions}
              onChange={(e) => setSetupInstructions(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="drill-scoring">{t("drillForm.scoring")}</Label>
            <Textarea
              id="drill-scoring"
              value={scoringMethod}
              onChange={(e) => setScoringMethod(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5 sm:max-w-[12rem]">
            <Label htmlFor="drill-max-score">{t("drillForm.maxScore")}</Label>
            <Input
              id="drill-max-score"
              type="number"
              min={1}
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={isSubmitting}
          >
            {t("common.delete")}
          </Button>
        )}
        {/* Route-aware, unlike the rest of this form: it always means "back to
            the drill this page hangs off", which the route already declares. */}
        <CancelLink />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}
