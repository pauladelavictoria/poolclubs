import { useId } from "react";
import {
  BALL_COLORS,
  BALL_RADIUS,
  isStriped,
} from "@/libs/algorithms/drillGeometry";
import { BallShadingDefs } from "./BallShadingDefs";
import { BallShading } from "./BallShading";

/**
 * A real ball, drawn the way the drill editor draws it on the felt.
 *
 * Shared rather than duplicated: the picker that chooses 9-ball and the palette
 * that drags a 9 onto a table are showing the same object, and they should not
 * be able to drift apart.
 */
export function BallGlyph({
  color,
  label,
  striped: stripedProp,
  spin = 0,
  shaded = false,
  className = "h-full w-full",
}: {
  color: string;
  label?: string;
  /** Overrides what the label implies. For a striped ball with no number on it —
   *  a 9 as decoration rather than as an object ball, which is what the invite
   *  poster hangs in its corner. */
  striped?: boolean;
  /** Degrees to turn the ball on the spot. Only the fill and the stripe turn —
   *  a ball resting at an angle, not a lamp lying on its side. */
  spin?: number;
  /** Sphere shading: the same gloss and rim falloff the drill editor paints on
   *  the felt. Off by default because at list size it costs two gradients to
   *  show nothing. */
  shaded?: boolean;
  className?: string;
}) {
  // The clip path needs a document-unique id: two of these on one page with the
  // same label would otherwise share one, and the second would clip to the
  // first's geometry.
  const clipId = useId();
  const fill = BALL_COLORS[color] ?? color;
  const striped = stripedProp ?? isStriped(label);

  return (
    <svg viewBox="-2 -2 4 4" className={className} aria-hidden>
      <defs>
        <BallShadingDefs />
      </defs>
      {/* The fill and the stripe turn together; nothing else does. */}
      <g transform={spin ? `rotate(${spin})` : undefined}>
        <circle r={BALL_RADIUS} fill={striped ? "#FFFFFF" : fill} />
        {striped && (
          <>
            <clipPath id={clipId}>
              <circle r={BALL_RADIUS} />
            </clipPath>
            <rect
              x={-BALL_RADIUS}
              y={-BALL_RADIUS * 0.55}
              width={BALL_RADIUS * 2}
              height={BALL_RADIUS * 1.1}
              fill={fill}
              clipPath={`url(#${clipId})`}
            />
          </>
        )}
      </g>
      {/* Outside the turned group: the light stays where the lamp is. */}
      {shaded && <BallShading />}
      {/* Drawn over the stripe so it rings the whole ball. Without it a yellow
          or a striped ball has no edge at all on a pale surface. */}
      <circle
        r={BALL_RADIUS}
        fill="none"
        stroke="var(--color-hairline-strong)"
        strokeWidth={0.1}
      />
      {label && (
        <>
          <circle r={0.8} fill="#FFFFFF" />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill="#111111"
            fontSize={label.length > 1 ? 1.05 : 1.35}
          >
            {label}
          </text>
        </>
      )}
    </svg>
  );
}
