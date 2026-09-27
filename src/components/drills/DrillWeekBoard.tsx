import { Fragment } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDrillBoard } from "@/hooks/useDrillOfWeek";
import { useT } from "@/i18n";
import { DrillWeekBoardRow } from "./DrillWeekBoardRow";

/**
 * The club's board for one drill this week. The same list
 * on the lobby, the drill page and the table tablet — `tablet` only sets it in
 * type you can read from the other end of the table.
 */
export default function DrillWeekBoard({
  drillId,
  since,
  limit = 10,
  highlight,
  tablet = false,
  scrollToHighlight = false,
}: {
  drillId: number;
  since: string;
  limit?: number;
  /** A player to pick out — you, or whoever just shot on the tablet. */
  highlight?: number;
  tablet?: boolean;
  scrollToHighlight?: boolean;
}) {
  const { t } = useT();
  const { data: rows, isLoading } = useDrillBoard(drillId, since);

  // Past the cut, the highlighted player still gets their own row: the top
  // `limit - 1`, a gap, and them — a board that leaves you off is no answer to
  // "where am I".
  const mineAt = rows?.findIndex((r) => r.player_id === highlight) ?? -1;
  const shown = (rows ?? [])
    .map((row, i) => ({ row, rank: i + 1 }))
    .filter(({ rank }) =>
      mineAt >= limit ? rank < limit || rank === mineAt + 1 : rank <= limit,
    );

  return (
    <div className="space-y-2">
      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-card" />
      ) : !rows?.length ? (
        <p className="py-3 text-center text-caption text-ink-faint">
          {t("drillWeek.empty")}
        </p>
      ) : (
        <ol>
          {shown.map(({ row, rank }, i) => {
            const mine = row.player_id === highlight;
            return (
              <Fragment key={row.player_id}>
                {i > 0 && rank - shown[i - 1].rank > 1 && (
                  <li aria-hidden className="px-2 text-center text-ink-faint">
                    ⋯
                  </li>
                )}
                <DrillWeekBoardRow
                  row={row}
                  rank={rank}
                  mine={mine}
                  tablet={tablet}
                  rowRef={
                    mine && scrollToHighlight
                      ? // Next frame: a ref runs before the dialog around this
                        // has been shown, and a hidden list does not scroll.
                        (el) => {
                          if (el)
                            requestAnimationFrame(() =>
                              el.scrollIntoView({ block: "nearest" }),
                            );
                        }
                      : undefined
                  }
                />
              </Fragment>
            );
          })}
        </ol>
      )}
    </div>
  );
}
