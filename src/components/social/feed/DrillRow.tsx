import SocialBar from "@/components/social/SocialBar";
import { Avatar } from "@/components/ui/Avatar";
import { usePlayerLookup } from "@/hooks/usePlayers";
import { useDrills } from "@/hooks/useDrills";
import { scoreBand, scorePct } from "@/libs/algorithms/scoreBand";
import { timeOf } from "@/libs/algorithms/dayLabel";
import type { DrillLog } from "@/types";
import { useT } from "@/i18n";
import { AppLink } from "@/components/layout/AppLink";

export default function DrillRow({ log }: { log: DrillLog }) {
  const { t, locale } = useT();
  const { byId } = usePlayerLookup();
  const { data: drills } = useDrills();

  const pct = scorePct(log.score, log.max_score);
  const band = scoreBand(pct);

  const author = byId.get(log.player_id);
  const name = author?.name ?? "—";

  return (
    <>
      {/* Title line: what was practised, and how it went. The percentage is the
          one figure worth reading from across the room. */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-caption font-medium uppercase tracking-[0.08em] text-strike">
            {t("drills.detailTitle")}
          </p>
          <AppLink
            to="/app/$clubSlug/drills/$drillId"
            params={{ drillId: log.drill_id }}
            className="block truncate text-body font-semibold text-ink transition-colors duration-150 hover:text-strike"
          >
            {drills?.find((d) => d.id === log.drill_id)?.name ??
              t("drills.numbered", { id: log.drill_id })}
          </AppLink>
        </div>
        <div className="shrink-0 text-right">
          <p
            className="font-mono text-h4 font-semibold tabular-nums"
            style={{ color: band.color }}
            title={t(`score.${band.key}`)}
          >
            {pct}%
          </p>
          <p className="font-mono text-caption tabular-nums text-ink-ghost">
            {log.score}/{log.max_score}
          </p>
        </div>
      </div>

      {/* Who did it. */}
      <AppLink
        to="/app/$clubSlug/players/$playerId"
        params={{ playerId: log.player_id }}
        className="mt-2 flex items-center gap-2 text-ink-soft transition-colors duration-150 hover:text-strike"
      >
        <Avatar name={name} url={author?.avatar_url} />
        <span className="min-w-0 flex-1 truncate text-body">{name}</span>
        <time
          dateTime={log.created_at}
          className="shrink-0 font-mono text-caption tabular-nums text-ink-ghost"
        >
          {timeOf(new Date(log.created_at), locale)}
        </time>
      </AppLink>

      <div className="mt-3 border-t border-hairline pt-2">
        <SocialBar target={{ drillLogId: log.id }} preview />
      </div>
    </>
  );
}
