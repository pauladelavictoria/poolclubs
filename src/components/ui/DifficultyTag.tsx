import type { DrillDifficulty } from "@/types";
import { useT } from "@/i18n";

const DOT: Record<DrillDifficulty, string> = {
  beginner: "bg-pot",
  intermediate: "bg-ball-1",
  advanced: "bg-ball-3",
};

const PIPS: Record<DrillDifficulty, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

export function DifficultyTag({
  difficulty,
  className = "",
  pips = false,
}: {
  difficulty: DrillDifficulty;
  className?: string;
  /**
   * Count instead of colour. On a tile that already carries a table diagram, a
   * word and a coloured dot is a third thing competing for the same line — one
   * two three reads at a glance and stays in the drills mark.
   */
  pips?: boolean;
}) {
  const { t } = useT();
  const label = t(`difficulty.${difficulty}`);

  if (pips) {
    return (
      <span
        className={`inline-flex items-center gap-1 ${className}`}
        title={label}
      >
        <span className="sr-only">{label}</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${
              i < PIPS[difficulty] ? "bg-mark-drills" : "bg-hairline-strong"
            }`}
          />
        ))}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${DOT[difficulty]}`}
      />
      {label}
    </span>
  );
}
