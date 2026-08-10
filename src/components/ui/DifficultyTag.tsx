import type { DrillDifficulty } from "@/types";
import { useT } from "@/i18n";

const DOT: Record<DrillDifficulty, string> = {
  beginner: "bg-pot",
  intermediate: "bg-ball-1",
  advanced: "bg-ball-3",
};

export function DifficultyTag({
  difficulty,
  className = "",
}: {
  difficulty: DrillDifficulty;
  className?: string;
}) {
  const { t } = useT();

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${DOT[difficulty]}`}
      />
      {t(`difficulty.${difficulty}`)}
    </span>
  );
}
