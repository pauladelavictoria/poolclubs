import { Link } from "react-router-dom";
import type { Drill } from "@/types";
import { DIFFICULTY_LABELS, SKILL_TYPE_LABELS } from "@/types";
import PoolTableDiagram from "./PoolTableDiagram";

interface DrillCardProps {
  drill: Drill;
}

/**
 * Difficulty is the only thing here worth a colour, and it earns one because
 * it's the thing you filter on. Skill type is metadata, so it stays neutral.
 */
const DIFFICULTY_DOT: Record<string, string> = {
  beginner: "bg-pot",
  intermediate: "bg-ball-1",
  advanced: "bg-strike",
};

export default function DrillCard({ drill }: DrillCardProps) {
  return (
    <Link
      to={`/drills/${drill.id}`}
      className="block rounded-card border border-hairline bg-felt p-3 transition-[background-color,border-color] duration-150 hover:border-hairline-strong hover:bg-felt-raised"
    >
      <div className="mb-3 overflow-hidden rounded-[6px]">
        <PoolTableDiagram
          ballPositions={drill.ball_positions}
          shotPaths={drill.shot_paths}
          compact
        />
      </div>

      <h3 className="line-clamp-1 font-medium text-ink">{drill.name}</h3>
      <p className="mt-0.5 line-clamp-2 text-caption text-ink-faint">
        {drill.description}
      </p>

      <div className="mt-2.5 flex items-center gap-2 text-caption text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${DIFFICULTY_DOT[drill.difficulty]}`}
          />
          {DIFFICULTY_LABELS[drill.difficulty]}
        </span>
        <span className="text-ink-ghost">·</span>
        <span className="truncate text-ink-faint">
          {SKILL_TYPE_LABELS[drill.skill_type]}
        </span>
      </div>
    </Link>
  );
}
