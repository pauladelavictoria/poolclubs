import { type Ref } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { type BoardRow } from "@/hooks/useDrillOfWeek";
import { useT } from "@/i18n";

export function DrillWeekBoardRow({
  row,
  rank,
  mine,
  tablet,
  rowRef,
}: {
  row: BoardRow;
  rank: number;
  mine: boolean;
  tablet: boolean;
  rowRef?: Ref<HTMLLIElement>;
}) {
  const { t } = useT();
  return (
    <li
      ref={rowRef}
      className={[
        "flex items-center gap-3 rounded-control px-2",
        tablet ? "py-2.5" : "py-1.5",
        mine ? "bg-strike-tint" : "",
      ].join(" ")}
    >
      <span
        className={`w-6 shrink-0 text-right font-mono tabular-nums text-ink-faint ${tablet ? "text-h4" : "text-caption"}`}
      >
        {rank}
      </span>
      <Avatar
        name={row.player_name}
        url={row.avatar_url}
        seed={row.player_id}
        className={tablet ? "h-10 w-10 shrink-0" : "h-7 w-7 shrink-0"}
      />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-ink ${tablet ? "text-h4" : "text-body"}`}>
          {row.player_name}
        </p>
        <p className="truncate text-caption text-ink-faint">
          {t("drillWeek.attempts", { n: row.attempts })}
        </p>
      </div>
      <span
        className={`shrink-0 font-mono font-semibold tabular-nums text-ink ${tablet ? "text-h3" : "text-body"}`}
      >
        {row.best_score}
        <span className="text-ink-faint">/{row.max_score}</span>
      </span>
    </li>
  );
}
