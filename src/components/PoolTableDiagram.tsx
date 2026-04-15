import type { BallPosition, ShotPath } from "@/types";

interface PoolTableDiagramProps {
  ballPositions: BallPosition[];
  shotPaths: ShotPath[];
  compact?: boolean;
}

const POCKET_RADIUS = 1.8;
const BALL_RADIUS = 1.5;
const RAIL_INSET = 2;

const POCKETS = [
  { x: 0, y: 0 },
  { x: 50, y: 0 },
  { x: 100, y: 0 },
  { x: 0, y: 50 },
  { x: 50, y: 50 },
  { x: 100, y: 50 },
];

// Diamond markers on the rails (standard positions)
const LONG_RAIL_DIAMONDS = [12.5, 25, 37.5, 50, 62.5, 75, 87.5];
const SHORT_RAIL_DIAMONDS = [12.5, 25, 37.5];

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
    <svg
      viewBox="-2 -2 104 54"
      className="w-full rounded-lg"
      style={{ maxWidth: compact ? 200 : 500 }}
    >
      {/* Table border (wood) */}
      <rect
        x={-1.5}
        y={-1.5}
        width={103}
        height={53}
        rx={1.5}
        fill="#5C3A1E"
      />

      {/* Felt */}
      <rect x={0} y={0} width={100} height={50} rx={0.5} fill="#0B6623" />

      {/* Rail lines */}
      <rect
        x={RAIL_INSET}
        y={RAIL_INSET}
        width={100 - RAIL_INSET * 2}
        height={50 - RAIL_INSET * 2}
        fill="none"
        stroke="#0A5C1F"
        strokeWidth={0.3}
      />

      {/* Diamond markers */}
      {!compact && (
        <>
          {/* Top rail */}
          {LONG_RAIL_DIAMONDS.map((x) => (
            <circle key={`dt-${x}`} cx={x} cy={0.8} r={0.4} fill="#C8A96E" />
          ))}
          {/* Bottom rail */}
          {LONG_RAIL_DIAMONDS.map((x) => (
            <circle key={`db-${x}`} cx={x} cy={49.2} r={0.4} fill="#C8A96E" />
          ))}
          {/* Left rail */}
          {SHORT_RAIL_DIAMONDS.map((y) => (
            <circle
              key={`dl-${y}`}
              cx={0.8}
              cy={y === 12.5 ? 12.5 : y === 25 ? 25 : 37.5}
              r={0.4}
              fill="#C8A96E"
            />
          ))}
          {/* Right rail */}
          {SHORT_RAIL_DIAMONDS.map((y) => (
            <circle
              key={`dr-${y}`}
              cx={99.2}
              cy={y === 12.5 ? 12.5 : y === 25 ? 25 : 37.5}
              r={0.4}
              fill="#C8A96E"
            />
          ))}
        </>
      )}

      {/* Head string line */}
      {!compact && (
        <line
          x1={25}
          y1={RAIL_INSET}
          x2={25}
          y2={50 - RAIL_INSET}
          stroke="#0A5C1F"
          strokeWidth={0.2}
          strokeDasharray="1 1"
        />
      )}

      {/* Foot spot */}
      {!compact && <circle cx={75} cy={25} r={0.5} fill="#0A5C1F" />}

      {/* Pockets */}
      {POCKETS.map((p, i) => (
        <circle key={`pocket-${i}`} cx={p.x} cy={p.y} r={POCKET_RADIUS} fill="#1A1A1A" />
      ))}

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
      </defs>

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
        return (
          <g key={`ball-${i}`}>
            <circle
              cx={ball.x}
              cy={ball.y}
              r={BALL_RADIUS}
              fill={fill}
              stroke={isWhite ? "#999" : "#000"}
              strokeWidth={0.3}
            />
            {/* Ball label */}
            {!compact && ball.label && fontSize > 0 && (
              <text
                x={ball.x}
                y={ball.y + BALL_RADIUS + fontSize + 0.5}
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
    </svg>
  );
}
