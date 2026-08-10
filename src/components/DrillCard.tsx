import { Link } from "react-router-dom";
import type { Drill } from "@/types";
import PoolTableDiagram from "./PoolTableDiagram";
import { DifficultyTag } from "@/components/ui/DifficultyTag";
import { useT } from "@/i18n";

interface DrillCardProps {
  drill: Drill;
}

export default function DrillCard({ drill }: DrillCardProps) {
  const { t } = useT();

  return (
    <Link
      to={`/app/drills/${drill.id}`}
      className="flex h-full flex-col overflow-hidden rounded-card border border-hairline bg-felt transition-[background-color,border-color] duration-150 hover:border-hairline-strong hover:bg-felt-raised"
    >
      {/* Portrait, and edge to edge: the table is what you are choosing
          between, so it gets the whole width instead of sitting inside a
          second frame. */}
      <PoolTableDiagram
        ballPositions={drill.ball_positions}
        shotPaths={drill.shot_paths}
        compact
        portrait
        className="rounded-none"
      />

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-body font-medium leading-snug text-ink">
          {drill.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-caption leading-snug text-ink-faint">
          {drill.description}
        </p>

        {/* Pinned to the bottom so the difficulty line agrees across a row
            whatever length the names and descriptions came out. */}
        <div className="mt-auto flex items-center gap-2 pt-3 text-caption text-ink-soft">
          <DifficultyTag difficulty={drill.difficulty} className="shrink-0" />
          <span className="ml-auto truncate text-ink-faint">
            {t(`skill.${drill.skill_type}`)}
          </span>
        </div>
      </div>
    </Link>
  );
}
