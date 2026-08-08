import type { BallPosition, ShotPath } from "@/types";

interface PoolTableDiagramProps {
  ballPositions: BallPosition[];
  shotPaths: ShotPath[];
  compact?: boolean;
}

// Table artwork, drawn at its own pixel size
const TABLE_W = 1734;
const TABLE_H = 922;

// The felt inside the artwork. Drill coordinates are 0-100 x 0-50 over this
// rect, so everything below is drawn in drill units inside one transform.
const FELT = { x: 82, y: 87, w: 1569, h: 746 };
const UNIT = FELT.w / 100; // ≈ 16.35 px per drill unit

const BALL_RADIUS = 1.5;

// A number or single letter fits on the ball; "blanca a mano" does not
const SHORT_LABEL = /^([0-9]{1,2}|[A-Za-z])$/;

const BALL_COLORS: Record<string, string> = {
  white: "#FFFFFF",
  yellow: "#FDD835",
  blue: "#1565C0",
  red: "#D32F2F",
  purple: "#7B1FA2",
  orange: "#EF6C00",
  green: "#2E7D32",
  maroon: "#6D1B1B",
  black: "#212121",
};

export default function PoolTableDiagram({
  ballPositions,
  shotPaths,
  compact = false,
}: PoolTableDiagramProps) {
  const fontSize = compact ? 0 : 2.5;

  return (
    <svg viewBox={`0 0 ${TABLE_W} ${TABLE_H}`} className="w-full rounded-lg">
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

      <g
        transform={`translate(${FELT.x} ${FELT.y}) scale(${UNIT} ${FELT.h / 50})`}
      >
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
        {shotPaths.map((path, i) => (
          <line
            key={`path-${i}`}
            x1={path.x1}
            y1={path.y1}
            x2={path.x2}
            y2={path.y2}
            stroke={
              path.type === "dashed"
                ? "rgba(255,255,100,0.5)"
                : "rgba(255,255,255,0.4)"
            }
            strokeWidth={0.5}
            strokeDasharray={path.type === "dashed" ? "2 1" : undefined}
            markerEnd={
              path.type === "dashed"
                ? "url(#arrowhead-dashed)"
                : "url(#arrowhead)"
            }
          />
        ))}

        {/* Balls */}
        {ballPositions.map((ball, i) => {
          const fill = BALL_COLORS[ball.color] ?? ball.color;
          const isWhite = ball.color === "white";
          const striped = ball.label === "raya";
          // Short labels go on the ball, anything longer sits underneath
          const onBall =
            !striped && !!ball.label && SHORT_LABEL.test(ball.label);
          return (
            <g key={`ball-${i}`} transform={`translate(${ball.x} ${ball.y})`}>
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
      </g>
    </svg>
  );
}
