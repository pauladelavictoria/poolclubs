import { BALL_RADIUS } from "@/libs/algorithms/drillGeometry";

/**
 * Drawn over the ball's fill, under its number. Light comes from the upper
 * left, so on a turned table this belongs inside the upright group — a
 * highlight that rotates with the felt reads as a lamp lying on its side.
 */
export function BallShading({ r = BALL_RADIUS }: { r?: number }) {
  return (
    <>
      <circle r={r} fill="url(#ball-shade)" />
      <circle r={r} fill="url(#ball-gloss)" />
      <ellipse
        cx={-r * 0.34}
        cy={-r * 0.4}
        rx={r * 0.24}
        ry={r * 0.16}
        fill="#FFFFFF"
        opacity={0.7}
      />
    </>
  );
}
