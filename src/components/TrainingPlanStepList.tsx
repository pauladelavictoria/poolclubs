import { Link } from "react-router-dom";
import type { TrainingPlanStep } from "@/types";
import { SKILL_TYPE_LABELS } from "@/types";
import { HiCheck, HiForward, HiPlay } from "react-icons/hi2";

interface TrainingPlanStepListProps {
  steps: TrainingPlanStep[];
  planId: number;
  onSkip: (stepId: number) => void;
  isSkipping?: boolean;
}

export default function TrainingPlanStepList({
  steps,
  planId,
  onSkip,
  isSkipping,
}: TrainingPlanStepListProps) {
  const currentStep = steps.find((s) => s.status === "pending");

  return (
    <div className="flex flex-col gap-2">
      {steps.map((step) => {
        const isCurrent = step.id === currentStep?.id;
        const isCompleted = step.status === "completed";
        const isSkipped = step.status === "skipped";
        const drill = step.drill;

        return (
          <div
            key={step.id}
            className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${
              isCurrent
                ? "bg-accent-red/10 border-accent-red/50"
                : isCompleted
                  ? "bg-green-900/10 border-green-700/30"
                  : isSkipped
                    ? "bg-gray-800/50 border-dark-border opacity-50"
                    : "bg-dark-bg border-dark-border"
            }`}
          >
            {/* Step number / status icon */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                isCompleted
                  ? "bg-green-600 text-white"
                  : isSkipped
                    ? "bg-gray-600 text-gray-400"
                    : isCurrent
                      ? "bg-accent-red text-white"
                      : "bg-dark-card text-gray-400 border border-dark-border"
              }`}
            >
              {isCompleted ? (
                <HiCheck className="h-4 w-4" />
              ) : isSkipped ? (
                <HiForward className="h-4 w-4" />
              ) : (
                step.step_order
              )}
            </div>

            {/* Drill info */}
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium text-sm truncate">
                {drill?.name ?? `Ejercicio ${step.step_order}`}
              </div>
              {drill && (
                <div className="text-xs text-gray-400">
                  {SKILL_TYPE_LABELS[drill.skill_type]}
                </div>
              )}
            </div>

            {/* Action */}
            {isCurrent && drill && (
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onSkip(step.id)}
                  disabled={isSkipping}
                  className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-dark-card transition-colors"
                >
                  Saltar
                </button>
                <Link
                  to={`/entrenamientos/${drill.id}?plan=${planId}&step=${step.id}`}
                  className="flex items-center gap-1 bg-accent-red hover:bg-accent-red-dark text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                >
                  <HiPlay className="h-3 w-3" />
                  Empezar
                </Link>
              </div>
            )}

            {!isCurrent && !isCompleted && !isSkipped && (
              <span className="text-xs text-gray-500 flex-shrink-0">
                Pendiente
              </span>
            )}

            {isCompleted && (
              <span className="text-xs text-green-400 flex-shrink-0">
                Completado
              </span>
            )}

            {isSkipped && (
              <span className="text-xs text-gray-500 flex-shrink-0">
                Saltado
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
