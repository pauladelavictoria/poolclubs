import { Link } from "react-router-dom";
import type { Drill } from "@/types";
import { DIFFICULTY_LABELS, SKILL_TYPE_LABELS } from "@/types";
import PoolTableDiagram from "./PoolTableDiagram";

interface DrillCardProps {
  drill: Drill;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:
    "bg-green-900/50 text-green-300 border border-green-700/50",
  intermediate:
    "bg-yellow-900/50 text-yellow-300 border border-yellow-700/50",
  advanced:
    "bg-red-900/50 text-red-300 border border-red-700/50",
};

export default function DrillCard({ drill }: DrillCardProps) {
  return (
    <Link
      to={`/entrenamientos/${drill.id}`}
      className="bg-dark-bg hover:bg-dark-card-hover rounded-2xl border border-dark-border p-4 transition-colors block"
    >
      <div className="mb-3">
        <PoolTableDiagram
          ballPositions={drill.ball_positions}
          shotPaths={drill.shot_paths}
          compact
        />
      </div>
      <h3 className="text-white font-semibold text-sm mb-2 line-clamp-1">
        {drill.name}
      </h3>
      <p className="text-gray-400 text-xs mb-3 line-clamp-2">
        {drill.description}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <span
          className={`px-2 py-0.5 rounded-lg text-xs font-medium ${DIFFICULTY_COLORS[drill.difficulty]}`}
        >
          {DIFFICULTY_LABELS[drill.difficulty]}
        </span>
        <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-700/50">
          {SKILL_TYPE_LABELS[drill.skill_type]}
        </span>
      </div>
    </Link>
  );
}
