import { useEffect, useRef, useState } from "react";
import {
  SNAP_GRAB_PX,
  angleFromCentre,
  fitViewBox,
  hitTestTables,
  pointToGridUnits,
  rotateHandlePoint,
  snapDrag,
  snapPosition,
  svgScale,
  type AlignGuide,
  type SpacingGuide,
  type TablePlacement,
} from "@/libs/algorithms/tableFloorPlan";
import type { ClubTable } from "@/types";

/** Screen px a rotate handle stays grabbable at, regardless of room size or
 *  zoom — see tableFloorPlan.ts's note on tablet-sized touch targets. */
const ROTATE_GRAB_PX = 44;

const NO_GUIDES = { align: [] as AlignGuide[], spacing: [] as SpacingGuide[] };

const toPlacement = (t: ClubTable): TablePlacement => ({
  id: t.id,
  x: t.map_x!,
  y: t.map_y!,
  rotationDeg: t.map_rotation ?? 0,
  type: t.type,
  size: t.size,
});

const placedOf = (tables: ClubTable[]) =>
  tables.filter((t) => t.map_x != null && t.map_y != null).map(toPlacement);

/**
 * The floor plan's interaction state: what is placed where, undo history,
 * and the drag/spawn/rotate tracking behind every pointer gesture on the
 * grid. Mirrors useDrillGeometryEditor's shape — pointer events, an undo
 * stack, a drag-from-toolbar spawn gesture — with one addition neither that
 * editor nor anything else in the app has: a rotate gesture (see
 * tableFloorPlan.ts's rotateHandlePoint/angleFromCentre for the design).
 *
 * Everything here is local and unsaved — nothing reaches Supabase until
 * ClubFloorPlanEditor's Save button calls saveTableLayout. A write on every
 * pointermove would hammer the network far more than a drag needs to, and
 * this runs on club tablets, where that matters more than it does for the
 * desktop drill editor.
 */
export function useTableFloorPlanEditor(tables: ClubTable[]) {
  const [placed, setPlaced] = useState<TablePlacement[]>(() =>
    placedOf(tables),
  );
  // The camera. Deliberately NOT `fitViewBox(placed)` computed fresh every
  // render: a live drag updates `placed` on every pointermove, and re-fitting
  // to that on every frame re-centres the whole room under whatever is being
  // dragged — the grid itself visibly swims while you're trying to hold a
  // table still. Instead this is its own state, only refit at the moments an
  // admin would expect the view to jump: a table is placed or removed, undo
  // fires, the server's layout changes underneath, or a drag/rotate gesture
  // finishes — never mid-gesture.
  const [view, setView] = useState(() => fitViewBox(placed));
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [history, setHistory] = useState<TablePlacement[][]>([]);
  const hasChanges = history.length > 0;

  // Re-sync from the server whenever there is nothing unsaved to lose, so a
  // realtime update (this table is realtime-subscribed) or another admin's
  // save still shows up. Adjusted during render rather than in an effect —
  // the pattern React itself recommends for "reset state when a prop
  // changes" — so a fresh `tables` reference never commits a stale frame
  // first. `prevTables` is what notices the prop actually changed; the
  // absence of unsaved edits is what allows the sync to happen at all.
  const [prevTables, setPrevTables] = useState(tables);
  if (prevTables !== tables) {
    setPrevTables(tables);
    if (!hasChanges) {
      const next = placedOf(tables);
      setPlaced(next);
      setView(fitViewBox(next));
    }
  }

  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<
    null | { kind: "move"; id: number } | { kind: "rotate"; id: number }
  >(null);
  // The smart guides currently on screen — only ever non-empty mid-move, and
  // only for the table being dragged; see handlePointerMove/Up.
  const [guides, setGuides] = useState(NO_GUIDES);

  const pushHistory = () => setHistory((prev) => [...prev.slice(-29), placed]);

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setPlaced(last);
    setView(fitViewBox(last));
    setSelectedId(null);
    setHistory((prev) => prev.slice(0, -1));
  };

  const unitsAt = (clientX: number, clientY: number) =>
    svgRef.current
      ? pointToGridUnits(svgRef.current, view, clientX, clientY)
      : null;

  /** How close a tap has to land on the rotate handle, in grid units, so its
   *  hit area stays a fixed screen size regardless of how zoomed out the
   *  room is. Uses the same svgScale as unitsAt — a width-only scale would
   *  disagree with the letterboxed coordinate the click was just converted
   *  through, and the handle would be grabbable everywhere but where it's
   *  actually drawn. */
  const rotateGrabUnits = () => {
    if (!svgRef.current) return 0;
    const scale = svgScale(svgRef.current.getBoundingClientRect(), view);
    return scale ? ROTATE_GRAB_PX / scale : 0;
  };

  /** Same conversion, tighter budget: how close a table has to come to a
   *  sibling's centre/edge, or to an equal gap, before it snaps — see
   *  SNAP_GRAB_PX in tableFloorPlan.ts. */
  const snapGrabUnits = () => {
    if (!svgRef.current) return 0;
    const scale = svgScale(svgRef.current.getBoundingClientRect(), view);
    return scale ? SNAP_GRAB_PX / scale : 0;
  };

  const removeFromMap = (id: number) => {
    pushHistory();
    const next = placed.filter((t) => t.id !== id);
    setPlaced(next);
    setView(fitViewBox(next));
    setSelectedId((s) => (s === id ? null : s));
  };

  // Delete/Backspace un-places the selected table, unless a field has focus
  // — same guard useDrillGeometryEditor uses.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (selectedId == null) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      e.preventDefault();
      removeFromMap(selectedId);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // --- Dragging a table already on the grid, or rotating the selected one -

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const p = unitsAt(e.clientX, e.clientY);
    if (!p) return;
    // Belt and suspenders alongside select-none on the svg itself: without
    // this a press-and-hold on a table's label can still start a native
    // text selection in some browsers, which then hijacks the gesture as a
    // text drag instead of reaching handlePointerMove below.
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    // The rotate handle exists only on the selected table: showing a grab
    // zone on every table at once would make a plain move unreliable to
    // start, the same reason drillGeometry only draws resize handles on a
    // selection.
    if (selectedId != null) {
      const selected = placed.find((t) => t.id === selectedId);
      if (selected) {
        const handle = rotateHandlePoint(selected);
        const grab = rotateGrabUnits();
        if (Math.hypot(p.x - handle.x, p.y - handle.y) <= grab) {
          pushHistory();
          drag.current = { kind: "rotate", id: selectedId };
          return;
        }
      }
    }

    const hitId = hitTestTables(placed, p);
    setSelectedId(hitId);
    if (hitId == null) return;
    pushHistory();
    drag.current = { kind: "move", id: hitId };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const active = drag.current;
    if (!active) return;
    const p = unitsAt(e.clientX, e.clientY);
    if (!p) return;

    if (active.kind === "move") {
      const dragged = placed.find((t) => t.id === active.id);
      if (!dragged) return;
      const others = placed.filter((t) => t.id !== active.id);
      // Guides first — a match here beats the plain grid snap, on whichever
      // axis it found one; see snapDrag.
      const snap = snapDrag(dragged, p.x, p.y, others, snapGrabUnits());
      setGuides({ align: snap.alignGuides, spacing: snap.spacingGuides });
      setPlaced((prev) =>
        prev.map((t) =>
          t.id === active.id ? { ...t, x: snap.x, y: snap.y } : t,
        ),
      );
      return;
    }

    // Rotating draws no guides — alignment is a translate-only idea, and any
    // left over from an earlier move on this same gesture would otherwise
    // linger, pointing at a position the table isn't near any more.
    if (guides !== NO_GUIDES) setGuides(NO_GUIDES);
    setPlaced((prev) =>
      prev.map((t) =>
        t.id === active.id ? { ...t, rotationDeg: angleFromCentre(t, p) } : t,
      ),
    );
  };

  const handlePointerUp = () => {
    // The view was frozen for the whole gesture (see the comment on `view`
    // above) — now that it's over, catch up: the table may have moved
    // outside the box that was framed when the drag started, or a rotation
    // may have changed its bounding box (a rectangle turned 45 degrees reaches
    // further than it did at 0).
    if (drag.current) setView(fitViewBox(placed));
    drag.current = null;
    setGuides(NO_GUIDES);
  };

  // --- Dragging an unplaced table's tray chip onto the grid ---------------

  const [spawn, setSpawn] = useState<{
    table: ClubTable;
    pos: { x: number; y: number } | null;
  } | null>(null);

  const startSpawn = (
    e: React.PointerEvent<HTMLButtonElement>,
    table: ClubTable,
  ) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSpawn({ table, pos: null });
  };

  const moveSpawn = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!spawn) return;
    const p = unitsAt(e.clientX, e.clientY);
    setSpawn((prev) => (prev ? { ...prev, pos: p } : prev));
  };

  const commitSpawn = () => {
    const flight = spawn;
    setSpawn(null);
    if (!flight?.pos) return; // let go before it ever reached the grid

    pushHistory();
    const next = [
      ...placed,
      {
        id: flight.table.id,
        x: snapPosition(flight.pos.x),
        y: snapPosition(flight.pos.y),
        rotationDeg: 0,
        type: flight.table.type,
        size: flight.table.size,
      },
    ];
    setPlaced(next);
    setView(fitViewBox(next));
    setSelectedId(flight.table.id);
  };

  const cancelSpawn = () => setSpawn(null);

  const unplaced = tables.filter((t) => t.map_x == null || t.map_y == null);

  return {
    svgRef,
    placed,
    unplaced,
    selectedId,
    setSelectedId,
    view,
    guides,
    hasChanges,
    undo,
    canUndo: history.length > 0,
    removeFromMap,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    spawn,
    startSpawn,
    moveSpawn,
    commitSpawn,
    cancelSpawn,
    markSaved: () => setHistory([]),
  };
}
