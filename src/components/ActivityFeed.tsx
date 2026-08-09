import { Link } from "react-router-dom";
import { LuActivity } from "react-icons/lu";
import SocialBar from "@/components/SocialBar";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useGetGames } from "@/hooks/useGetGames";
import { useGetDrillLogs } from "@/hooks/useGetDrillLogs";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useGetDrills } from "@/hooks/useGetDrills";
import { scoreBand, scorePct } from "@/libs/scoreBand";
import { dayLabel, sameDay } from "@/libs/dayLabel";
import type { DrillLog, Game } from "@/types";
import { useT } from "@/i18n";

/** One row of the club's history: either a match or a logged drill. */
type FeedItem = { at: string; game?: Game; log?: DrillLog };

function DrillRow({ log }: { log: DrillLog }) {
  const { t, locale } = useT();
  const { data: players } = useGetPlayers();
  const { data: drills } = useGetDrills();

  const pct = scorePct(log.score, log.max_score);
  const band = scoreBand(pct);
  const timeFmt = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const author = players?.find((p) => p.id === log.player_id);
  const name = author?.name ?? "—";

  return (
    <>
      {/* Title line: what was practised, and how it went. The percentage is the
          one figure worth reading from across the room. */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-caption font-medium uppercase tracking-[0.08em] text-ink-ghost">
            {t("drills.detailTitle")}
          </p>
          <Link
            to={`/drills/${log.drill_id}`}
            className="block truncate text-body font-semibold text-ink transition-colors duration-150 hover:text-strike"
          >
            {drills?.find((d) => d.id === log.drill_id)?.name ??
              t("drills.numbered", { id: log.drill_id })}
          </Link>
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
      <Link
        to={`/players/${log.player_id}`}
        className="mt-2 flex items-center gap-2 text-ink-soft transition-colors duration-150 hover:text-ink"
      >
        <Avatar name={name} url={author?.avatar_url} />
        <span className="min-w-0 flex-1 truncate text-body">{name}</span>
        <time
          dateTime={log.created_at}
          className="shrink-0 font-mono text-caption tabular-nums text-ink-ghost"
        >
          {timeFmt.format(new Date(log.created_at))}
        </time>
      </Link>

      <div className="mt-3 border-t border-hairline pt-2">
        <SocialBar target={{ drillLogId: log.id }} preview />
      </div>
    </>
  );
}

/** One side of a match: faces on top, names under them, so the card reads as
 *  two people rather than as two rows of text. */
function Side({
  ids,
  names,
  won,
}: {
  ids: (number | undefined)[];
  names: (string | undefined)[];
  won: boolean;
}) {
  const { data: players } = useGetPlayers();
  // Singles pass an empty second slot; a doubles row missing its partner name
  // drops the same way rather than rendering a blank face.
  const people = ids
    .map((id, i) => ({
      id,
      name: names[i],
      url: players?.find((p) => p.id === id)?.avatar_url,
    }))
    .filter((person) => !!person.name);

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <div className="flex -space-x-3">
        {people.map((person, i) => (
          <Avatar
            key={i}
            name={person.name ?? "?"}
            url={person.url}
            className={`h-12 w-12 ${won ? "" : "opacity-70"}`}
          />
        ))}
      </div>
      <span
        className={`w-full truncate text-body ${
          won ? "font-semibold text-ink" : "text-ink-faint"
        }`}
      >
        {people.map((p) => p.name).join(" / ")}
      </span>
    </div>
  );
}

function MatchCard({ game }: { game: Game }) {
  const { t, locale } = useT();

  const isDoubles = game.mode === "doubles";
  const p1 = parseInt(game.player_1_score, 10) || 0;
  const p2 = parseInt(game.player_2_score, 10) || 0;

  const timeFmt = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-caption font-medium uppercase tracking-[0.08em] text-ink-ghost">
          {isDoubles ? t("games.doubles") : t("games.single")}
        </p>
        <time
          dateTime={game.created_at}
          className="shrink-0 font-mono text-caption tabular-nums text-ink-ghost"
        >
          {timeFmt.format(new Date(game.created_at))}
        </time>
      </div>

      {/* The score is the focal element; the two sides mirror around it, so the
          winner reads as weight rather than as a colour. */}
      <div className="mt-3 flex items-center gap-3">
        <Side
          ids={[game.player_1_id, isDoubles ? game.player_1b_id : undefined]}
          names={[game.player_1_name, isDoubles ? game.player_1b_name : undefined]}
          won={p1 > p2}
        />
        {/* h-12 self-start puts the score on the avatars' centre line, not on
            the centre of avatar-plus-name. */}
        <span className="flex h-12 shrink-0 items-center self-start font-mono text-h2 font-semibold tabular-nums">
          <span className={p1 > p2 ? "text-ink" : "text-ink-faint"}>{p1}</span>
          <span className="px-1 text-ink-ghost">-</span>
          <span className={p2 > p1 ? "text-ink" : "text-ink-faint"}>{p2}</span>
        </span>
        <Side
          ids={[game.player_2_id, isDoubles ? game.player_2b_id : undefined]}
          names={[game.player_2_name, isDoubles ? game.player_2b_name : undefined]}
          won={p2 > p1}
        />
      </div>

      <div className="mt-3 border-t border-hairline pt-2">
        <SocialBar target={{ gameId: game.id }} preview />
      </div>
    </>
  );
}

/**
 * The club's home timeline: matches and drill results in one stream, newest
 * first, each carrying its own reactions and comments.
 */
export default function ActivityFeed({ limit = 20 }: { limit?: number }) {
  const { t, locale } = useT();
  const { data: gamesData, isLoading } = useGetGames({ pageSize: limit });
  const { data: logs } = useGetDrillLogs({ limit });
  const { data: players } = useGetPlayers();

  // drill_logs carries no club_id — someone in two clubs can read both sets, so
  // the club's own roster is what scopes them.
  const roster = new Set((players ?? []).map((p) => p.id));

  const items: FeedItem[] = [
    ...(gamesData?.games ?? []).map((game) => ({ at: game.created_at, game })),
    ...(logs ?? [])
      .filter((log) => roster.has(log.player_id))
      .map((log) => ({ at: log.created_at, log })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);

  if (isLoading) return <SkeletonRows rows={6} />;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<LuActivity className="h-5 w-5" />}
        title={t("dashboard.noActivity")}
        hint={t("games.emptyHint")}
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const date = new Date(item.at);
        const newDay =
          index === 0 || !sameDay(date, new Date(items[index - 1].at));

        return (
          <div key={item.game ? `g${item.game.id}` : `d${item.log!.id}`}>
            {newDay && (
              <h3
                className={`px-1 pb-1.5 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint ${
                  index === 0 ? "" : "pt-5"
                }`}
              >
                {dayLabel(date, t, locale)}
              </h3>
            )}
            {/* One card per result — the conversation under it belongs to that
                result, not to the list. */}
            <Card className="px-4 py-3">
              {item.game ? (
                <MatchCard game={item.game} />
              ) : (
                <DrillRow log={item.log!} />
              )}
            </Card>
          </div>
        );
      })}
    </div>
  );
}
