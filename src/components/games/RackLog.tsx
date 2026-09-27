import { LuZap } from "react-icons/lu";
import { Card } from "@/components/ui/Card";
import { racksLine } from "@/libs/algorithms/night";
import type { Game } from "@/types";
import { useT } from "@/i18n";

/**
 * The score after every rack, in order. The number that just moved is in the
 * club colour; the chip is the margin, on the leader's side, green when it went
 * to them and red when it closed the gap.
 *
 * ponytail: nothing at all when the log does not add up to the score — a game
 * filed before racks were kept, typed in by hand, or edited afterwards. Hidden
 * rather than reconciled: a log that disagrees with the result is worse than
 * none.
 */
export default function RackLog({
  game,
}: {
  game: Pick<Game, "racks" | "player_1_score" | "player_2_score">;
}) {
  const { t } = useT();
  const racks = game.racks ?? [];
  if (
    racks.length === 0 ||
    racks.length !== game.player_1_score + game.player_2_score
  )
    return null;

  // Fixed widths, so every row lines up on the dash as the numbers grow.
  const num = (n: number, moved: boolean, align: string) => (
    <span
      className={[
        "w-8 tabular-nums",
        align,
        moved ? "text-club" : "text-ink",
      ].join(" ")}
    >
      {n}
    </span>
  );

  return (
    <Card className="overflow-hidden">
      <h2 className="m-3 rounded-lg bg-felt-raised py-2.5 text-center text-caption font-semibold uppercase tracking-wide text-ink-soft">
        {t("games.racks")}
      </h2>
      <ol className="flex flex-col items-center gap-4 pt-3 pb-6">
        {racksLine(racks).map(({ p1, p2, side, runout }, i) => {
          const lead = p1 - p2;
          /** The margin sits on the leader's side; level, there is none. The
           *  ⚡ sits on the side that won the rack, outside the margin. */
          const slot = (n: 1 | 2) => (
            <span
              className={[
                "flex w-20 items-center gap-2",
                n === 1 ? "flex-row-reverse" : "",
              ].join(" ")}
            >
              {(n === 1 ? lead > 0 : lead < 0) && (
                <span
                  className={[
                    "min-w-10 rounded-md border border-hairline px-2 py-1 text-center text-caption font-semibold tabular-nums",
                    side === n ? "text-pot" : "text-accent-red",
                  ].join(" ")}
                >
                  +{Math.abs(lead)}
                </span>
              )}
              {runout && side === n && (
                <LuZap
                  className="h-4 w-4 shrink-0 text-strike"
                  title={t("live.runout")}
                  aria-label={t("live.runout")}
                />
              )}
            </span>
          );
          return (
            <li key={i} className="flex items-center gap-6">
              {slot(1)}
              <span className="flex items-center gap-2 text-h3 font-semibold">
                {num(p1, side === 1, "text-right")}
                <span className="text-caption text-ink">-</span>
                {num(p2, side === 2, "text-left")}
              </span>
              {slot(2)}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
