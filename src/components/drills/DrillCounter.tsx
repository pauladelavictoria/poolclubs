import { LuMinus, LuPlus } from "react-icons/lu";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";
import type { Player } from "@/types";

export function DrillCounter({
  shooter,
  score,
  max,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  shooter: Player;
  score: number;
  max: number;
  onChange: (n: number) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const { t } = useT();
  const pct = max > 0 ? (score / max) * 100 : 0;
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar
          name={shooter.name}
          url={shooter.avatar_url}
          seed={shooter.id}
          className="h-10 w-10"
        />
        <span className="truncate text-h3 font-semibold text-ink">
          {shooter.name}
        </span>
      </div>
      <p
        className="text-center font-mono leading-none font-semibold tabular-nums text-ink"
        style={{ fontSize: "clamp(4rem, 18vmin, 10rem)" }}
      >
        {score}
        <span className="text-[0.35em] text-ink-faint">/{max}</span>
      </p>
      {/* The wire the beads slide along, as a bar: max_score runs to 100. */}
      <div className="h-2 overflow-hidden rounded-full bg-hairline">
        <div
          className="h-full bg-strike transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Same two columns as the row under it, so − sits over Cancel and +
          over Save. */}
      <div className="grid flex-1 grid-cols-2 gap-3">
        <button
          type="button"
          aria-label={t("drillWeek.undo")}
          disabled={score === 0}
          onClick={() => onChange(Math.max(0, score - 1))}
          className="flex min-h-24 items-center justify-center rounded-card border border-hairline bg-felt text-ink disabled:opacity-40"
        >
          <LuMinus className="h-10 w-10" aria-hidden />
        </button>
        <button
          type="button"
          aria-label={t("drillWeek.made")}
          disabled={score >= max}
          onClick={() => onChange(Math.min(max, score + 1))}
          className="flex min-h-24 items-center justify-center rounded-card bg-strike text-white disabled:opacity-40"
        >
          <LuPlus className="h-10 w-10" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          {t("common.cancel")}
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {t("drillWeek.save")}
        </Button>
      </div>
    </div>
  );
}
