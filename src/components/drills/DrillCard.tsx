import type { Drill } from "@/types";
import { Link } from "@tanstack/react-router";
import PoolTableDiagram from "./PoolTableDiagram";
import { cardClasses } from "@/components/ui/cardStyles";
import { DifficultyTag } from "@/components/ui/DifficultyTag";
import { useT } from "@/i18n";
import { LuCheck } from "react-icons/lu";
import { scoreBand } from "@/libs/algorithms/scoreBand";
import { AppLink } from "@/components/layout/AppLink";

interface DrillCardProps {
  drill: Drill;
  /** Rendered outside /app, on the public catalog. AppLink reads $clubSlug from
   *  the route it sits under, so it cannot be used where there is no club in the
   *  path — this picks the public URL instead. */
  public?: boolean;
  /** Table lying down instead of standing up. For a row of cards rather than a
   *  grid of them: a portrait table in a carousel card is two thirds of the
   *  screen tall on its own. */
  landscape?: boolean;
  /** The viewer's best on it, as a percentage — set once they have logged it.
   *  A done drill wears the accent tint and its best, so the library reads as
   *  "what I have and have not tried" at a glance. */
  best?: number;
}

export default function DrillCard({
  drill,
  public: isPublic,
  landscape,
  best,
}: DrillCardProps) {
  const done = best !== undefined;
  const { t } = useT();

  const className = cardClasses({
    interactive: true,
    className: [
      "relative flex h-full flex-col overflow-hidden",
      isPublic ? "group lift" : "",
      done ? "bg-strike-tint ring-1 ring-strike/50" : "",
    ]
      .filter(Boolean)
      .join(" "),
  });

  const body = (
    <>
      {/* Edge to edge: the table is what you are choosing between, so it gets
          the whole width instead of sitting inside a second frame. Standing up
          by default — a phone is portrait, so that is the bigger table. */}
      <PoolTableDiagram
        ballPositions={drill.ball_positions}
        shotPaths={drill.shot_paths}
        compact
        portrait={!landscape}
        className={
          isPublic
            ? "rounded-none transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-[1.03]"
            : "rounded-none"
        }
      />

      {done && (
        <span
          className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-pocket/85 px-2 py-0.5 font-mono text-caption font-semibold tabular-nums"
          style={{ color: scoreBand(best).color }}
          title={t("drills.yourBest")}
        >
          <LuCheck className="h-3.5 w-3.5" aria-hidden />
          {best}%
        </span>
      )}

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
