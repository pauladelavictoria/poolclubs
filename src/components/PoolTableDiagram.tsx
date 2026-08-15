import type { ReactNode, Ref } from "react";
import type { BallPosition, ShotPath } from "@/types";
import {
  BALL_COLORS,
  BALL_RADIUS,
  FELT,
  TABLE_H,
  TABLE_W,
  UNIT_X,
  UNIT_Y,
  isStriped,
  type Selection,
} from "@/libs/drillGeometry";
import { useTheme } from "@/libs/theme";
import { BallShading, BallShadingDefs } from "@/components/ui/Ball";

interface PoolTableDiagramProps {
  ballPositions: BallPosition[];
  shotPaths: ShotPath[];
  compact?: boolean;
  /**
   * Turn the table a quarter turn, head end at the bottom, the way you stand
   * over it. A phone is portrait, so this is four times the table for the same
   * screen width. Drill coordinates never change; only the drawing turns.
   */
  portrait?: boolean;
  /** Extra classes on the svg, e.g. to drop the corner radius when the caller
   *  already clips it. */
  className?: string;
  /** Editor only: draws a ring around the ball / recolours the path. */
  selected?: Selection | null;
  /** Editor only: the pointer handlers and the ref both live on the <svg>. */
  svgRef?: Ref<SVGSVGElement>;
  onPointerDown?: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove?: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp?: (e: React.PointerEvent<SVGSVGElement>) => void;
  /** Editor only: extra SVG drawn in drill units, e.g. the arrow being dragged. */
  children?: ReactNode;
}

// A number or single letter fits on the ball; "blanca a mano" does not
const SHORT_LABEL = /^([0-9]{1,2}|[A-Za-z])$/;

// Presentation attributes are CSS properties, so the token reaches them and the
// selection ring wears whatever colour the club picked.
const SELECTED_STROKE = "var(--color-strike)";

export default function PoolTableDiagram({
  ballPositions,
  shotPaths,
  compact = false,
  portrait = false,
  className = "",
  selected = null,
  svgRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  children,
}: PoolTableDiagramProps) {
  const fontSize = compact ? 0 : 2.5;
  // Two copies of the artwork rather than one filtered: the dark table is lit
  // by a lamp over a dim room, the light one is the same table in daylight, and
  // a brightness filter gives neither.
  const artwork = useTheme() === "light" ? "/table-light.svg" : "/table.svg";

  // A quarter turn anticlockwise, then slid back into frame: drill x runs up
  // the screen from the head end, drill y runs across it.
  const turn = portrait ? `translate(0 ${TABLE_W}) rotate(-90)` : undefined;
  // Text has to turn back, and the two axes are scaled differently, so the
  // counter-turn carries the ratio between them or the glyphs come out sheared.
  const upright = portrait
    ? `rotate(90) scale(${UNIT_X / UNIT_Y} 1)`
    : undefined;

  return (
    <svg
      ref={svgRef}
      viewBox={
        portrait ? `0 0 ${TABLE_H} ${TABLE_W}` : `0 0 ${TABLE_W} ${TABLE_H}`
      }
      // touch-none only in the editor: on a read-only diagram it would eat the
      // page scroll of anyone who swipes across the table
      className={`w-full rounded-card ${onPointerDown ? "touch-none" : ""} ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Arrow marker definition */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth={3}
          markerHeight={2}
          refX={3}
          refY={1}
          orient="auto"
        >
          <polygon points="0 0, 3 1, 0 2" fill="rgba(255,255,255,0.6)" />
        </marker>
        <marker
          id="arrowhead-dashed"
          markerWidth={3}
          markerHeight={2}
          refX={3}
          refY={1}
          orient="auto"
        >
          <polygon points="0 0, 3 1, 0 2" fill="rgba(255,255,100,0.6)" />
        </marker>
        {/* Keeps a striped ball's band inside the ball */}
        <clipPath id="ball-clip">
          <circle r={BALL_RADIUS} />
        </clipPath>
        {/* The playing surface. A ball's shadow falls on cloth, not on the
            cushion above it, so the whole ball layer is cut to this. */}
        <clipPath id="felt-clip">
          <rect x={0} y={0} width={100} height={50} />
        </clipPath>
        {/* The rails stand proud of the cloth, so they throw a shadow inwards.
            A stroke on the felt edge, half of it outside and blurred, then cut
            back to the felt: what is left is the band along the cushions. */}
        {/* Lifts the balls off the felt, in place of an outline. Offset away
            from the light so the ball sits on the cloth rather than hovering. */}
        <filter id="ball-shadow" x="-50%" y="-50%" width="250%" height="250%">
          <feDropShadow
            dx={portrait ? -0.35 : 0.35}
            dy={0.35}
            stdDeviation={0.45}
            floodColor="#000000"
            floodOpacity={0.55}
          />
        </filter>
        <BallShadingDefs />
      </defs>

      <g transform={turn}>
        <image href={artwork} width={TABLE_W} height={TABLE_H} />

        <g
          transform={`translate(${FELT.x} ${FELT.y}) scale(${UNIT_X} ${UNIT_Y})`}
        >
          {/* Head string line */}
          <line
            x1={25}
            y1={0.5}
            x2={25}
            y2={49.7}
            stroke="#f4f2ec3d"
            strokeWidth={0.1}
          />
          <line
            x1={0}
            y1={15}
            x2={25}
            y2={15}
            stroke="#f4f2ec3d"
            strokeWidth={0.1}
          />
          <line
            x1={0}
            y1={35}
            x2={25}
            y2={35}
            stroke="#f4f2ec3d"
            strokeWidth={0.1}
          />

          {/* Centre spot and foot spot */}
          <circle cx={70} cy={25} r={0.35} fill="#f4f2ec3d" />
          <circle cx={75} cy={25} r={0.35} fill="#f4f2ec3d" />

          {/* Shot paths */}
          {shotPaths.map((path, i) => {
            const isSelected =
              selected?.kind === "path" && selected.index === i;
            return (
              <line
                key={`path-${i}`}
                x1={path.x1}
                y1={path.y1}
                x2={path.x2}
                y2={path.y2}
                stroke={
                  isSelected
                    ? SELECTED_STROKE
                    : path.type === "dashed"
                      ? "rgba(255,255,100,0.5)"
                      : "rgba(255,255,255,0.4)"
                }
                strokeWidth={isSelected ? 0.7 : 0.5}
                strokeDasharray={path.type === "dashed" ? "2 1" : undefined}
                markerEnd={
                  path.type === "dashed"
                    ? "url(#arrowhead-dashed)"
                    : "url(#arrowhead)"
                }
              />
            );
          })}

          {/* Ball bodies. Clipped as one layer rather than one ball at a time:
              the clip is in felt coordinates, and each ball group carries its
              own translate, so a shared path only lines up out here. Labels are
              a second pass below, unclipped, so a ball by the bottom rail keeps
              its caption and no ball covers a neighbour's. */}
          <g clipPath="url(#felt-clip)">
            {ballPositions.map((ball, i) => {
              const fill = BALL_COLORS[ball.color] ?? ball.color;
              const striped = isStriped(ball.label);
              return (
                <g
                  key={`ball-${i}`}
                  transform={`translate(${ball.x} ${ball.y})`}
                >
                  {striped ? (
                    <>
                      <circle
                        r={BALL_RADIUS}
                        fill="#FFFFFF"
                        filter="url(#ball-shadow)"
                      />
                      {/* Turned back with the table: a stripe runs across the
                        ball as you look at it, not along the felt. The clip is
                        a circle, so it does not care which way the band
                        points. */}
                      <g transform={portrait ? "rotate(90)" : undefined}>
                        <rect
                          x={-BALL_RADIUS}
                          y={-BALL_RADIUS * 0.55}
                          width={BALL_RADIUS * 2}
                          height={BALL_RADIUS * 1.1}
                          fill={fill}
                          clipPath="url(#ball-clip)"
                        />
                      </g>
                    </>
                  ) : (
                    <circle
                      r={BALL_RADIUS}
                      fill={fill}
                      filter="url(#ball-shadow)"
                    />
                  )}

                  {/* Sphere shading. Turned back with the table but without the
                    axis ratio the text needs: a circle is a circle either way,
                    so it still covers the ball exactly, and the highlight stays
                    in the upper left of the screen. */}
                  <g transform={portrait ? "rotate(90)" : undefined}>
                    <BallShading />
                  </g>
                </g>
              );
            })}
          </g>

          {/* Ball labels and the editor's selection ring */}
          {ballPositions.map((ball, i) => {
            const isWhite = ball.color === "white";
            const striped = isStriped(ball.label);
            // Short labels go on the ball, anything longer sits underneath
            const onBall = !!ball.label && SHORT_LABEL.test(ball.label);
            const isSelected =
              selected?.kind === "ball" && selected.index === i;
            return (
              <g
                key={`label-${i}`}
                transform={`translate(${ball.x} ${ball.y})`}
              >
                {isSelected && (
                  <circle
                    r={BALL_RADIUS + 0.7}
                    fill="none"
                    stroke={SELECTED_STROKE}
                    strokeWidth={0.35}
                  />
                )}
                {/* Ball label. The wrapper keeps it upright when the table is
                  turned; without a turn it is an empty transform. */}
                <g transform={upright}>
                  {!compact && onBall && (
                    <>
                      {!isWhite && <circle r={0.8} fill="#FFFFFF" />}
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#111111"
                        fontSize={ball.label!.length > 1 ? 1.05 : 1.35}
                      >
                        {ball.label}
                      </text>
                    </>
                  )}
                  {!compact &&
                    ball.label &&
                    !onBall &&
                    !striped &&
                    fontSize > 0 && (
                      <text
                        y={BALL_RADIUS + fontSize + 0.5}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.7)"
                        fontSize={fontSize}
                      >
                        {ball.label}
                      </text>
                    )}
                </g>
              </g>
            );
          })}

          {children}
        </g>
      </g>
    </svg>
  );
}
