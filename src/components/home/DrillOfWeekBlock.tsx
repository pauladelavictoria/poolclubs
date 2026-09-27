import DrillWeekBoard from "@/components/drills/DrillWeekBoard";
import PoolTableDiagram from "@/components/drills/PoolTableDiagram";
import { DifficultyTag } from "@/components/ui/DifficultyTag";
import { useDrillBoard, useDrillOfWeek } from "@/hooks/useDrillOfWeek";
import { HomeSection } from "@/components/home/HomeSection";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useT } from "@/i18n";
import { AppLink } from "@/components/layout/AppLink";

/**
 * The week's drill: what it is, where you stand, and the club's top five. The
 * reason to walk over to a free table this week — see libs/algorithms/drillOfWeek.
 */
export function DrillOfWeekBlock() {
  const { t } = useT();
  const { player } = useAuth();
  const { drill, since } = useDrillOfWeek();
  // Same key as the board below, so this is one request.
  const { data: rows } = useDrillBoard(drill?.id, since);
  // Nothing until the board is in: whether it is dressed up depends on it,
  // and guessing would paint the loud version and then quiet it down.
  if (!drill || !rows) return null;

  const mine = rows.find((r) => r.player_id === player?.id);
  const pending = !mine;
  // Somebody to beat, when somebody else has already shot it.
  const leader = rows.find((r) => r.player_id !== player?.id);

  return (
    <HomeSection titleKey="drillWeek.title">
      <Card
        className={[
          "grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
          // Unplayed, it asks for the tap: the accent ring and a tint. Played,
          // it is one block among the others.
          pending ? "bg-strike-tint ring-2 ring-strike" : "",
        ].join(" ")}
      >
        <AppLink
          to="/app/$clubSlug/drills/$drillId"
          params={{ drillId: drill.id }}
          className="group block space-y-3"
        >
          <PoolTableDiagram
            ballPositions={drill.ball_positions}
            shotPaths={drill.shot_paths}
            compact
          />
          <div>
            {pending && (
              <span className="mb-1.5 inline-block rounded-full bg-strike px-2 py-0.5 text-caption font-semibold text-pocket">
                {t("drillWeek.pending")}
              </span>
            )}
            <h3
              className={`font-semibold text-ink group-hover:text-strike ${pending ? "text-h3" : "text-h4"}`}
            >
              {drill.name}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-caption text-ink-faint">
              <DifficultyTag difficulty={drill.difficulty} />
              <span className="text-ink-ghost">·</span>
              <span>{t(`skill.${drill.skill_type}`)}</span>
            </div>
          </div>
          <p className="text-body text-ink-soft">
            {mine
              ? t("drillWeek.yourBest", {
                  score: mine.best_score,
                  max: mine.max_score,
                })
              : leader
                ? t("drillWeek.beat", {
                    name: leader.player_name,
                    score: leader.best_score,
                    max: leader.max_score,
                  })
                : t("drillWeek.beFirst")}
          </p>
          <span
            className={buttonClasses({
              size: pending ? "md" : "sm",
              className: pending ? "w-full justify-center" : "",
            })}
          >
            {t("drillWeek.play")}
          </span>
        </AppLink>
        <div className="space-y-2">
          <h3 className="text-caption font-medium uppercase tracking-wide text-ink-faint">
            {t("drillWeek.board")}
          </h3>
          <DrillWeekBoard
            drillId={drill.id}
            since={since}
            limit={5}
            highlight={player?.id}
          />
        </div>
      </Card>
    </HomeSection>
  );
}
