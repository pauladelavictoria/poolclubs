import {
  BALL_COLORS,
  CIRCLE_SPAWN_RADIUS,
  RECT_SPAWN_HALF,
  snap,
} from "@/libs/algorithms/drillGeometry";
import {
  ARROW_SPAWN_LENGTH,
  BALL_RADIUS,
  type SpawnSource,
} from "@/hooks/useDrillGeometryEditor";

/**
 * What is under the pointer mid-drag: the ball, arrow, circle or rectangle
 * about to be dropped, at the size it will land.
 *
 * Drawn from the same constants as spawnShape rather than from a real shape,
 * because there is nothing in the arrays yet — the felt clamping is the one
 * thing it does not repeat, so a ghost near a rail is a touch off where the
 * shape settles.
 */
export function DrillShapeGhost({
  source,
  at,
}: {
  source: SpawnSource;
  at: { x: number; y: number };
}) {
  const line = {
    stroke: "rgba(255,255,255,0.5)",
    strokeWidth: 0.5,
    fill: "none",
  };

  if (source === "arrow")
    return (
      <line
        x1={at.x - ARROW_SPAWN_LENGTH / 2}
        y1={at.y}
        x2={at.x + ARROW_SPAWN_LENGTH / 2}
        y2={at.y}
        {...line}
      />
    );

  if (source === "circle")
    return <circle cx={at.x} cy={at.y} r={CIRCLE_SPAWN_RADIUS} {...line} />;

  if (source === "rect")
    return (
      <rect
        x={at.x - RECT_SPAWN_HALF.w}
        y={at.y - RECT_SPAWN_HALF.h}
        width={RECT_SPAWN_HALF.w * 2}
        height={RECT_SPAWN_HALF.h * 2}
        {...line}
      />
    );

  return (
    <circle
      cx={snap(at.x)}
      cy={snap(at.y)}
      r={BALL_RADIUS}
      fill={BALL_COLORS[source.color] ?? source.color}
      opacity={0.6}
    />
  );
}
