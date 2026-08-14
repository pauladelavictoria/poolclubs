import type { Drill } from "@/types";
import PoolTableDiagram from "./PoolTableDiagram";
import { cardClasses } from "@/components/ui/cardStyles";
import { DifficultyTag } from "@/components/ui/DifficultyTag";
import { useT } from "@/i18n";
import { AppLink } from "@/components/AppLink";

interface DrillCardProps {
  drill: Drill;
}

export default function DrillCard({ drill }: DrillCardProps) {
  const { t } = useT();

  return (
    <AppLink
      to="/app/$clubSlug/drills/$drillId"
      params={{ drillId: drill.id }}
      className={cardClasses({
        interactive: true,
        className: "flex h-full flex-col overflow-hidden",
      })}
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
        <div className="mt-auto flex items-center gap-2 pt-3 text-caption">
          <DifficultyTag
            difficulty={drill.difficulty}
            pips
            className="shrink-0"
          />
          {/* What the drill is *for*, in the drills mark: on a wall of tiles it
              is the one word you scan the grid by. */}
          <span className="ml-auto truncate font-medium uppercase tracking-[0.08em] text-strike">
            {t(`skill.${drill.skill_type}`)}
          </span>
        </div>
      </div>
    </AppLink>
  );
}
