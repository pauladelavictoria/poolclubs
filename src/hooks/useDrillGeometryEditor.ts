import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ARROW_SPAWN_LENGTH,
  BALLS,
  BALL_RADIUS,
  clampBall,
  distanceToOutline,
  hitTest,
  isOnFelt,
  pointToUnits,
  rectGrabAt,
  snap,
  spawnShape,
  type RectGrab,
  type Selection,
} from "@/libs/algorithms/drillGeometry";
import type { BallPosition, ShotPath } from "@/types";

type BallEntry = (typeof BALLS)[number];
/** What is being dragged out of the toolbar: a ball, or one of the shapes.
 *  The shapes are the strings, which is how the two are told apart below. */
export type SpawnSource = BallEntry | ShapeSource;
export type ShapeSource = "arrow" | "circle" | "rect";

/** Past this many px a press counts as a drag rather than a tap. */
const DRAG_THRESHOLD = 4;
/** Grab radius for a path endpoint or a shape's outline; further in and the
 *  whole thing moves instead.
 *
 *  ponytail: a shape shrunk smaller than this is all outline and no inside, so
 *  it can only be resized, not moved. Undo and delete both still reach it, and
 *  the fix if it ever bites is a minimum size in spawnShape's units. */
const ENDPOINT_GRAB = 2;
/** Where a tapped item lands when there is no drop point: middle of the felt. */
const FELT_CENTRE = { x: 50, y: 25 };

/**
 * The drill table's interaction state machine: what is selected, undo
 * history, and the drag/spawn tracking behind every pointer gesture on the
 * felt. `balls`/`paths` are controlled — DrillForm owns them, since it is
 * what submits them — everything else here is UI-only state private to the
 * editor.
 */
export function useDrillGeometryEditor({
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
    /** A rectangle corner or side, as the stored coordinates it writes. */
    | ({ kind: "rect"; index: number } & RectGrab)
    /** A circle's rim: the pointer becomes the rim point, so the radius is
     *  however far it is from the centre. */
    | { kind: "circle"; index: number }
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
    const shape = typeof flight.source === "string" ? flight.source : null;
    const fallback =
      !shape && selected?.kind === "ball" ? balls[selected.index] : FELT_CENTRE;
    const target = flight.moved ? flight.pos : fallback;
    if (!target) return; // dragged off the table: nothing to do

    pushHistory();

    // An arrow, a circle or a rectangle: where it lands and how big it starts
    // are geometry, so they live in drillGeometry rather than here.
    if (shape) {
      setPaths((prev) => [...prev, spawnShape(shape, target)]);
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
    const move = { kind: "path-move", index: hit.index, last: p } as const;

    // A closed shape resizes from its whole outline and moves from its inside.
    // Anything narrower does not work in practice: the two points a shape is
    // stored as are one arbitrary spot on the rim and two of the four corners,
    // and nothing on screen says which — so every other grab silently moved
    // the shape instead of resizing it.
    if (path.shape === "circle") {
      drag.current =
        distanceToOutline(path, p) <= ENDPOINT_GRAB
          ? { kind: "circle", index: hit.index }
          : move;
      return;
    }

    if (path.shape === "rect") {
      const grab = rectGrabAt(path, p, ENDPOINT_GRAB);
      drag.current = grab ? { kind: "rect", index: hit.index, ...grab } : move;
      return;
    }

    // An arrow: two real, visible handles.
    const d1 = Math.hypot(p.x - path.x1, p.y - path.y1);
    const d2 = Math.hypot(p.x - path.x2, p.y - path.y2);
    drag.current =
      Math.min(d1, d2) <= ENDPOINT_GRAB
        ? { kind: "path", index: hit.index, end: d1 <= d2 ? 1 : 2 }
        : move;
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

    // Resizing a rectangle: whichever of the four stored numbers this grab
    // owns — two for a corner, one for a side. rectOf reads the corners in
    // either order, so pulling one past the other flips the rectangle rather
    // than turning it inside out.
    if (active.kind === "rect") {
      const patch = {
        ...(active.ax ? { [active.ax]: snap(p.x) } : {}),
        ...(active.ay ? { [active.ay]: snap(p.y) } : {}),
      };
      setPaths((prev) =>
        prev.map((path, i) =>
          i === active.index ? { ...path, ...patch } : path,
        ),
      );
      return;
    }

    // Resizing a circle: the rim point goes where the pointer is, and the
    // radius is the distance from the centre it never moved.
    if (active.kind === "circle") {
      setPaths((prev) =>
        prev.map((path, i) =>
          i === active.index ? { ...path, x2: snap(p.x), y2: snap(p.y) } : path,
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

  /** The browser can cancel a pointer gesture mid-flight (a system gesture
   *  stealing it, say) — this clears the in-flight spawn without committing
   *  it, the same way letting go off the felt does. */
  const cancelSpawn = () => setSpawn(null);

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

  return {
    svgRef,
    selected,
    selectedBall,
    selectedPath,
    history,
    spawn,
    ghost: spawn?.pos,
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
  };
}

export { ARROW_SPAWN_LENGTH, BALL_RADIUS };
