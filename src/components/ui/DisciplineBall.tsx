import { BALLS } from "@/libs/algorithms/drillGeometry";
import type { Discipline } from "@/types";
import { BallGlyph } from "./BallGlyph";

/** Each discipline is named after the ball that ends the rack. */
const DISCIPLINE_BALL: Record<Discipline, string> = {
  "8ball": "8",
  "9ball": "9",
  "10ball": "10",
};

export function DisciplineBall({
  discipline,
  // Bigger than the icon default: a ball has a number on it, and at 16px the
  // stripe and the digit both stop reading.
  className = "h-5 w-5",
}: {
  discipline: Discipline;
  className?: string;
}) {
  const ball = BALLS.find((b) => b.label === DISCIPLINE_BALL[discipline]);
  if (!ball) return null;
  return (
    <BallGlyph color={ball.color} label={ball.label} className={className} />
  );
}
