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

interface PoolTableDiagramProps {
  ballPositions: BallPosition[];
  shotPaths: ShotPath[];
  compact?: boolean;
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

const SELECTED_STROKE = "#e23744"; // --color-strike; SVG attrs can't read the token

export default function PoolTableDiagram({
  ballPositions,
  shotPaths,
  compact = false,
  selected = null,
  svgRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  children,
}: PoolTableDiagramProps) {
  const fontSize = compact ? 0 : 2.5;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${TABLE_W} ${TABLE_H}`}
      // touch-none only in the editor: on a read-only diagram it would eat the
      // page scroll of anyone who swipes across the table
      className={`w-full rounded-lg ${onPointerDown ? "touch-none" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <image href="/table.svg" width={TABLE_W} height={TABLE_H} />

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
        {/* Lifts the balls off the felt, in place of an outline */}
        <filter id="ball-shadow" x="-75%" y="-75%" width="250%" height="250%">
          <feDropShadow
            dx={0}
            dy={0}
            stdDeviation={0.5}
            floodColor="#000000"
            floodOpacity={0.5}
          />
        </filter>
      </defs>

      <g transform={`translate(${FELT.x} ${FELT.y}) scale(${UNIT_X} ${UNIT_Y})`}>
        {/* Head string line */}
        {!compact && (
          <line
            x1={25}
            y1={2}
            x2={25}
            y2={50}
            stroke="#c8e3f369"
            strokeWidth={0.2}
            strokeDasharray="1 1"
          />
        )}

        {/* Foot spot */}
        {!compact && <circle cx={75} cy={25} r={0.5} fill="#c8e3f369" />}

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

        {/* Balls */}
        {ballPositions.map((ball, i) => {
          const fill = BALL_COLORS[ball.color] ?? ball.color;
          const isWhite = ball.color === "white";
          const striped = isStriped(ball.label);
          // Short labels go on the ball, anything longer sits underneath
          const onBall = !!ball.label && SHORT_LABEL.test(ball.label);
          const isSelected =
            selected?.kind === "ball" && selected.index === i;
          return (
            <g key={`ball-${i}`} transform={`translate(${ball.x} ${ball.y})`}>
              {isSelected && (
                <circle
                  r={BALL_RADIUS + 0.7}
                  fill="none"
                  stroke={SELECTED_STROKE}
                  strokeWidth={0.35}
                />
              )}
              {striped ? (
                <>
                  <circle
                    r={BALL_RADIUS}
                    fill="#FFFFFF"
                    filter="url(#ball-shadow)"
                  />
                  <rect
                    x={-BALL_RADIUS}
                    y={-BALL_RADIUS * 0.55}
                    width={BALL_RADIUS * 2}
                    height={BALL_RADIUS * 1.1}
                    fill={fill}
                    clipPath="url(#ball-clip)"
                  />
                </>
              ) : (
                <circle
                  r={BALL_RADIUS}
                  fill={fill}
                  filter="url(#ball-shadow)"
                />
              )}

              {/* Ball label */}
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
          );
        })}

        {children}
      </g>
    </svg>
  );
}
