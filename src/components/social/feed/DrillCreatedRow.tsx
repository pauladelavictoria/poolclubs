import PoolTableDiagram from "@/components/drills/PoolTableDiagram";
import { timeOf } from "@/libs/algorithms/dayLabel";
import type { Drill } from "@/types";
import { useT } from "@/i18n";
import { AppLink } from "@/components/layout/AppLink";

/** A drill that was written. Same dashed weight as the row below it, but the
 *  table itself is the drill — a name alone says nothing about what you would
 *  be setting up. */
export default function DrillCreatedRow({
  drill,
  at,
}: {
  drill: Drill;
  at: string;
}) {
  const { t, locale } = useT();

  return (
    <AppLink
      to="/app/$clubSlug/drills/$drillId"
      params={{ drillId: drill.id }}
      className="flex flex-col gap-3 rounded-card border border-dashed border-hairline p-2 transition-colors duration-150 hover:border-hairline-strong hover:bg-felt sm:flex-row sm:items-center"
    >
      {/* Always lying down — a table is a landscape object, and turning it up on
          its end to save a phone some width makes it read as a different shape.
          The phone gets the room by putting the text underneath instead.

          Sized by the wrapper: the diagram carries its own w-full, and two width
          utilities on one element are settled by the stylesheet, not by the
          order they are written in. */}
      <div className="w-full shrink-0 sm:w-64">
        <PoolTableDiagram
          ballPositions={drill.ball_positions}
          shotPaths={drill.shot_paths}
          compact
          className="rounded-control"
        />
      </div>
      {/* The same three sizes a result card uses — eyebrow, title, body — so a
          new drill is not written smaller than a drill somebody scored. */}
      <div className="min-w-0 flex-1">
        <p className="text-caption font-medium uppercase tracking-[0.08em] text-strike">
          {t("drills.new")}
        </p>
        <p className="truncate text-body font-semibold text-ink">
          {drill.name}
        </p>
        <p className="mt-1 line-clamp-3 text-body leading-snug text-ink-faint">
          {drill.description}
        </p>
      </div>
      <time
        dateTime={at}
        className="shrink-0 self-end pr-1 font-mono text-caption tabular-nums text-ink-ghost sm:self-start"
      >
        {timeOf(new Date(at), locale)}
      </time>
    </AppLink>
  );
}
