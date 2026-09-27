/**
 * Sphere shading, shared by every ball on the page.
 *
 * The gradients carry no colour of their own — a white bloom and a black rim
 * falloff painted over whatever fill the ball already has — so one pair of
 * defs serves all sixteen balls instead of a gradient per hue. Duplicate ids
 * across svgs are harmless because every copy is identical.
 */
export function BallShadingDefs() {
  return (
    <>
      <radialGradient id="ball-gloss" cx="0.34" cy="0.3" r="0.62">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
        <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="ball-shade" cx="0.36" cy="0.32" r="0.78">
        <stop offset="50%" stopColor="#000000" stopOpacity="0" />
        <stop offset="85%" stopColor="#000000" stopOpacity="0.28" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.6" />
      </radialGradient>
    </>
  );
}
