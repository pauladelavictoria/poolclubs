import type { CSSProperties } from "react";
import type { Drill } from "@/types";
import { Link } from "@tanstack/react-router";
import PoolTableDiagram from "./PoolTableDiagram";
import { cardClasses } from "@/components/ui/cardStyles";
import { DifficultyTag } from "@/components/ui/DifficultyTag";
import { useT } from "@/i18n";
import { AppLink } from "@/components/layout/AppLink";

interface DrillCardProps {
  drill: Drill;
  /** Rendered outside /app, on the public catalog. AppLink reads $clubSlug from
   *  the route it sits under, so it cannot be used where there is no club in the
   *  path — this picks the public URL instead. */
  public?: boolean;
  /** Entrance stagger index — public catalog only. /app's own grids stay
   *  exactly as they were; `.pop` and `.lift` are no-ops there anyway (the
   *  tokens they read are transparent outside the public skin), but the entry
   *  animation itself is a public-only touch. */
  index?: number;
}

export default function DrillCard({
  drill,
  public: isPublic,
  index,
}: DrillCardProps) {
  const { t } = useT();

  const className = cardClasses({
    interactive: true,
    className: [
      "flex h-full flex-col overflow-hidden",
      isPublic ? "group pop lift" : "",
    ]
      .filter(Boolean)
      .join(" "),
  });
  const style = isPublic ? ({ "--i": index ?? 0 } as CSSProperties) : undefined;

  const body = (
    <>
      {/* Portrait, and edge to edge: the table is what you are choosing
          between, so it gets the whole width instead of sitting inside a
          second frame. */}
      <PoolTableDiagram
        ballPositions={drill.ball_positions}
        shotPaths={drill.shot_paths}
        compact
        portrait
        className={
          isPublic
            ? "rounded-none transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-[1.03]"
            : "rounded-none"
        }
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
    </>
  );

  return isPublic ? (
    <Link
      to="/drills/$drillId"
      params={{ drillId: String(drill.id) }}
      className={className}
      style={style}
    >
      {body}
    </Link>
  ) : (
    <AppLink
      to="/app/$clubSlug/drills/$drillId"
      params={{ drillId: drill.id }}
      className={className}
    >
      {body}
    </AppLink>
  );
}
