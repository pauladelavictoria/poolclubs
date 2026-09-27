import { useDrillBoard } from "@/hooks/useDrillOfWeek";
import { useDialog } from "@/hooks/useDialog";
import { dialogClasses } from "@/components/ui/cardStyles";
import DrillWeekBoard from "@/components/drills/DrillWeekBoard";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";
import type { Player } from "@/types";

/**
 * The saved score, where it lands on the club's board, and the two ways on:
 * the same player again, or back to the table. Dismissing it is trying again
 * — the scoreboard behind is where Esc or a tap outside leaves you.
 */
export function DrillResultDialog({
  open,
  drillId,
  since,
  shooter,
  score,
  max,
  onRetry,
  onDone,
}: {
  open: boolean;
  drillId: number;
  since: string;
  shooter: Player;
  score: number;
  max: number;
  onRetry: () => void;
  onDone: () => void;
}) {
  const { t } = useT();
  const ref = useDialog(open);
  const { data: rows } = useDrillBoard(drillId, since);
  const rank = (rows?.findIndex((r) => r.player_id === shooter.id) ?? -1) + 1;

  return (
    <dialog
      ref={ref}
      className={dialogClasses({ wide: true })}
      aria-label={shooter.name}
      onClose={() => open && onRetry()}
      onClick={(e) => {
        if (e.target === ref.current) onRetry();
      }}
    >
      <div className="space-y-4 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-h3 font-semibold text-ink">
              {shooter.name}
            </p>
            {rank > 0 && (
              <p className="text-h4 text-ink-soft">
                {t("drillWeek.rankClub", { n: rank })}
              </p>
            )}
          </div>
          <p className="shrink-0 font-mono text-h2 font-semibold tabular-nums text-ink">
            {score}
            <span className="text-ink-faint">/{max}</span>
          </p>
        </div>
        <div className="max-h-[50dvh] overflow-y-auto outline-none">
          <DrillWeekBoard
            drillId={drillId}
            since={since}
            highlight={shooter.id}
            tablet
            scrollToHighlight
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="h-14 flex-1 text-h4"
            onClick={onDone}
          >
            {t("drillWeek.done")}
          </Button>
          <Button className="h-14 flex-1 text-h4" onClick={onRetry}>
            {t("drillWeek.tryAgain")}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
