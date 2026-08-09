import { Link } from "react-router-dom";
import type { TrainingPlanStep } from "@/types";
import { LuCheck, LuSkipForward, LuPlay } from "react-icons/lu";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useT } from "@/i18n";

interface TrainingPlanStepListProps {
  steps: TrainingPlanStep[];
  planId: number;
  playerId: number;
  onSkip: (stepId: number) => void;
  isSkipping?: boolean;
}

/**
 * A plan is a queue with exactly one live item. The current step is the only
 * row that carries colour or an action; everything else is either done or
 * waiting, and reads that way at a glance.
 */
export default function TrainingPlanStepList({
  steps,
  planId,
  playerId,
  onSkip,
  isSkipping,
}: TrainingPlanStepListProps) {
  const { t } = useT();
  const currentStep = steps.find((s) => s.status === "pending");

  return (
    <ol className="space-y-1.5">
      {steps.map((step) => {
        const isCurrent = step.id === currentStep?.id;
        const isCompleted = step.status === "completed";
        const isSkipped = step.status === "skipped";
        const drill = step.drill;

        return (
          <li
            key={step.id}
            className={[
              "flex items-center gap-3 rounded-control border px-3 py-2.5",
              isCurrent
                ? "border-strike/40 bg-strike-tint"
                : "border-hairline bg-pocket",
              isSkipped ? "opacity-55" : "",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                "font-mono text-caption font-semibold tabular-nums",
                isCompleted
                  ? "bg-pot text-pocket"
                  : isCurrent
                    ? "bg-strike text-white"
                    : "bg-ball-cue text-ink-faint",
              ].join(" ")}
            >
              {isCompleted ? (
                <LuCheck className="h-4 w-4" />
              ) : isSkipped ? (
                <LuSkipForward className="h-4 w-4" />
              ) : (
                step.step_order
              )}
            </span>

            <div className="min-w-0 flex-1">
              <div
                className={`truncate ${isCurrent ? "font-medium text-ink" : "text-ink-soft"}`}
              >
                {drill?.name ??
                  t("drills.stepNumbered", { n: step.step_order })}
              </div>
              {drill && (
                <div className="truncate text-caption text-ink-faint">
                  {t(`skill.${drill.skill_type}`)}
                </div>
              )}
            </div>

            {(isCurrent || isSkipped) && drill ? (
              <div className="flex shrink-0 items-center gap-1">
                {isCurrent && (
                  <button
                    type="button"
                    onClick={() => onSkip(step.id)}
                    disabled={isSkipping}
                    className="h-8 rounded-control px-2.5 text-caption text-ink-faint transition-colors duration-150 hover:bg-felt-raised hover:text-ink"
                  >
                    {t("training.skip")}
                  </button>
                )}
                <Link
                  to={`/drills/${drill.id}?plan=${planId}&step=${step.id}&playerId=${playerId}`}
                  className={buttonClasses({
                    size: "sm",
                    variant: isSkipped ? "ghost" : "primary",
                  })}
                >
                  <LuPlay className="h-3.5 w-3.5" aria-hidden />
                  {isSkipped ? t("training.resume") : t("training.start")}
                </Link>
              </div>
            ) : (
              <span className="shrink-0 text-caption text-ink-faint">
                {isCompleted
                  ? t("training.completed")
                  : isSkipped
                    ? t("training.skipped")
                    : t("training.pending")}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
