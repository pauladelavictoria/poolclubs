import type { ReactNode } from "react";

/**
 * A metric, decided rather than flat: the figure leads through size + weight,
 * the label is demoted to tracked caption, and only the delta may carry colour.
 */
export function Stat({
  label,
  value,
  delta,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  tone?: "neutral" | "good";
}) {
  return (
    <div>
      <div className="text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className={`font-mono text-h1 font-semibold tabular-nums ${
            tone === "good" ? "text-pot" : "text-ink"
          }`}
        >
          {value}
        </span>
        {delta && (
          <span className="text-caption font-medium text-ink-faint">{delta}</span>
        )}
      </div>
    </div>
  );
}
