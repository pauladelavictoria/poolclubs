import { useEffect, useRef, useState } from "react";
import { LuActivity, LuTrophy } from "react-icons/lu";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useGames } from "@/hooks/useGames";
import { useDrillLogs } from "@/hooks/useDrillLogs";
import { usePlayers } from "@/hooks/usePlayers";
import { useDrills } from "@/hooks/useDrills";
import { useTournaments, useGameTournaments } from "@/hooks/useTournaments";
import { TournamentResultCard } from "@/components/tournaments/TournamentFeedCard";
import { dayLabel, startsNewDay } from "@/libs/algorithms/dayLabel";
import { groupTournamentRuns } from "@/libs/algorithms/feedGroups";
import type { Tournament } from "@/types";
import { useT } from "@/i18n";
import { DRILLS_ENABLED } from "@/libs/algorithms/features";
import CreatedRow from "./feed/CreatedRow";
import DrillCreatedRow from "./feed/DrillCreatedRow";
import DrillRow from "./feed/DrillRow";
import FeedMatchCard from "./feed/FeedMatchCard";
import TournamentGamesCard from "./feed/TournamentGamesCard";
import { rank, type FeedItem } from "./feed/types";

/**
 * The club's home timeline: matches and drill results in one stream, newest
 * first, each carrying its own reactions and comments.
 */
export default function ActivityFeed({ pageSize = 20 }: { pageSize?: number }) {
  const { t, locale } = useT();
  // How far back the feed currently reaches. Widening the window rather than
  // stitching pages together: the sources are three lists merged by time, and
  // page 2 of one of them is not page 2 of the feed.
  const [limit, setLimit] = useState(pageSize);
  const sentinel = useRef<HTMLDivElement>(null);
  const {
    data: gamesData,
    isLoading,
    isFetching,
  } = useGames({
    pageSize: limit,
  });
  const { data: logs } = useDrillLogs({ limit });
  const { data: players } = usePlayers();
  const { data: drills } = useDrills();
  const { data: tournaments } = useTournaments();

  // drill_logs carries no club_id — someone in two clubs can read both sets, so
  // the club's own roster is what scopes them.
  const roster = new Set((players ?? []).map((p) => p.id));

  const games = gamesData?.games ?? [];
  const { data: gameTournaments } = useGameTournaments(games.map((g) => g.id));

  /** A finished tournament belongs to the day its last game was played, not to
   *  the day somebody created it — a month-long league would otherwise announce
   *  its result at the bottom of the feed. Only the games in view are known
   *  here, so a final played further back falls back to the creation date. */
  const endedAt = (tournament: Tournament) =>
    games
      .filter((g) => gameTournaments?.get(g.id)?.id === tournament.id)
      .reduce(
        (latest, g) => (g.played_at > latest ? g.played_at : latest),
        "",
      ) || tournament.created_at;

  const merged: FeedItem[] = [
    ...games.map((game) => ({ at: game.played_at, games: [game] })),
    // Both drill shapes drop out together while drills are hidden — a row that
    // links to a 404 is worse than no row. See libs/features.
    ...(DRILLS_ENABLED ? (logs ?? []) : [])
      .filter((log) => roster.has(log.player_id))
      .map((log) => ({ at: log.created_at, log })),
    // drills are shared across clubs, so every club sees a new one written.
    // The sort and the slice below keep the old library out of the way.
    ...(DRILLS_ENABLED ? (drills ?? []) : []).map((drill) => ({
      at: drill.created_at,
      drill,
    })),
    ...(tournaments ?? [])
      .filter((x) => x.status !== "open")
      .map((tournament) => ({
        at:
          tournament.status === "done"
            ? endedAt(tournament)
            : tournament.created_at,
        tournament,
      })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at) || rank(a) - rank(b))
    .slice(0, limit);

  const items = groupTournamentRuns(
    merged,
    (game) => gameTournaments?.get(game.id)?.id,
  );

  // A full window means there may be more behind it; a short one is the end of
  // the club's history.
  const hasMore = merged.length >= limit;

  useEffect(() => {
    const node = sentinel.current;
    // Nothing to watch, or the last widening is still in flight — re-observing
    // then would fire again on the same rows and skip a page.
    if (!node || !hasMore || isFetching) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setLimit((n) => n + pageSize);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isFetching, pageSize]);

  return (
    <div className="space-y-3">
      {/* Drawn before the rows load: a section heading that appears late shifts
          the page under whoever is already reading it. */}
      <h2 className="px-1 pb-1 text-h4 font-semibold text-ink">
        {t("dashboard.activity")}
      </h2>

      {isLoading && <SkeletonRows rows={6} />}

      {!isLoading && items.length === 0 && (
        <EmptyState
          icon={<LuActivity className="h-5 w-5" />}
          title={t("dashboard.noActivity")}
          hint={t("games.emptyHint")}
        />
      )}

      {items.map((item, index) => {
        const date = new Date(item.at);
        const newDay = startsNewDay(
          date,
          index > 0 ? new Date(items[index - 1].at) : undefined,
        );

        const key = item.games
          ? `g${item.games[0].id}`
          : item.log
            ? `l${item.log.id}`
            : item.drill
              ? `d${item.drill.id}`
              : `t${item.tournament!.id}`;

        return (
          <div key={key}>
            {newDay && (
              <h3
                className={`px-1 pb-1.5 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint ${
                  index === 0 ? "" : "pt-5"
                }`}
                // "Today" depends on the reader's timezone, which the server
                // does not have — see libs/dayLabel.
                suppressHydrationWarning
              >
                {dayLabel(date, t, locale)}
              </h3>
            )}
            {/* Three weights, so the feed reads as a feed and not as a stack of
                identical boxes: a result gets a card, because the conversation
                under it belongs to that result; a finished tournament gets the
                raised surface; an announcement gets neither. */}
            {item.games && item.games.length > 1 ? (
              <Card className="overflow-hidden px-4 py-3">
                <TournamentGamesCard
                  games={item.games}
                  tournament={gameTournaments!.get(item.games[0].id)!}
                />
              </Card>
            ) : item.drill ? (
              <DrillCreatedRow drill={item.drill} at={item.at} />
            ) : item.tournament && item.tournament.status !== "done" ? (
              <CreatedRow
                icon={
                  <LuTrophy className="h-3.5 w-3.5 text-strike" aria-hidden />
                }
                label={t("tournaments.new")}
                name={item.tournament.name}
                to="/app/$clubSlug/tournaments/$tournamentId"
                params={{ tournamentId: item.tournament.id }}
                at={item.at}
              />
            ) : (
              <Card
                className={
                  item.tournament
                    ? "overflow-hidden bg-felt-raised px-4 py-3"
                    : "px-4 py-3"
                }
              >
                {item.games ? (
                  <FeedMatchCard
                    game={item.games[0]}
                    tournament={gameTournaments?.get(item.games[0].id)}
                  />
                ) : item.log ? (
                  <DrillRow log={item.log} />
                ) : (
                  <TournamentResultCard tournament={item.tournament!} />
                )}
              </Card>
            )}
          </div>
        );
      })}

      {/* Reaching this is the request for the next window — and the skeleton it
          shows is what the next window is about to fill. */}
      {hasMore && (
        <div ref={sentinel}>
          <SkeletonRows rows={2} />
        </div>
      )}
    </div>
  );
}
