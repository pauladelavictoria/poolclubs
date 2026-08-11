import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { LuActivity, LuTrophy } from "react-icons/lu";
import PoolTableDiagram from "@/components/PoolTableDiagram";
import SocialBar from "@/components/SocialBar";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useGetGames } from "@/hooks/useGetGames";
import { useGetDrillLogs } from "@/hooks/useGetDrillLogs";
import { useGetPlayers, usePlayerLookup } from "@/hooks/useGetPlayers";
import { useGetDrills } from "@/hooks/useGetDrills";
import { useGetTournaments, useGameTournaments } from "@/hooks/useTournaments";
import {
  TournamentOpenCard,
  TournamentResultCard,
} from "@/components/TournamentFeedCard";
import { scoreBand, scorePct } from "@/libs/scoreBand";
import { dayLabel, startsNewDay, timeOf } from "@/libs/dayLabel";
import type { Drill, DrillLog, Game, Tournament } from "@/types";
import { useT } from "@/i18n";

/** One row of the club's history: a match, a logged drill, or one of the two
 *  things that get created rather than played — a drill or a tournament. */
type FeedItem = {
  at: string;
  game?: Game;
  log?: DrillLog;
  drill?: Drill;
  tournament?: Tournament;
};

function DrillRow({ log }: { log: DrillLog }) {
  const { t, locale } = useT();
  const { byId } = usePlayerLookup();
  const { data: drills } = useGetDrills();

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
          <p className="text-caption font-medium uppercase tracking-[0.08em] text-ink-ghost">
            {t("drills.detailTitle")}
          </p>
          <Link
            to={`/app/drills/${log.drill_id}`}
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
        to={`/app/players/${log.player_id}`}
        className="mt-2 flex items-center gap-2 text-ink-soft transition-colors duration-150 hover:text-ink"
      >
        <Avatar name={name} url={author?.avatar_url} />
        <span className="min-w-0 flex-1 truncate text-body">{name}</span>
        <time
          dateTime={log.created_at}
          className="shrink-0 font-mono text-caption tabular-nums text-ink-ghost"
        >
          {timeOf(new Date(log.created_at), locale)}
        </time>
      </Link>

      <div className="mt-3 border-t border-hairline pt-2">
        <SocialBar target={{ drillLogId: log.id }} preview />
      </div>
    </>
  );
}

/** A drill that was written. Same dashed weight as the row below it, but the
 *  table itself is the drill — a name alone says nothing about what you would
 *  be setting up. */
function DrillCreatedRow({ drill, at }: { drill: Drill; at: string }) {
  const { t, locale } = useT();

  return (
    <Link
      to={`/app/drills/${drill.id}`}
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
        <p className="text-caption font-medium uppercase tracking-[0.08em] text-ink-ghost">
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
    </Link>
  );
}

/**
 * Something was added to the club rather than played: a tournament opened, and
 * anything else with nothing to show for itself yet. Nobody scored anything, so
 * it gets no card — one dashed line on the canvas, which is what stops a page
 * of identical boxes.
 */
function CreatedRow({
  icon,
  label,
  name,
  to,
  at,
}: {
  icon: ReactNode;
  label: string;
  name: string;
  to: string;
  at: string;
}) {
  const { locale } = useT();

  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-card border border-dashed border-hairline px-3 py-2 text-caption transition-colors duration-150 hover:border-hairline-strong hover:bg-felt"
    >
      <span className="shrink-0 text-ink-faint">{icon}</span>
      <span className="min-w-0 flex-1 truncate">
        <span className="text-ink-faint">{label} · </span>
        <span className="font-medium text-ink">{name}</span>
      </span>
      <time
        dateTime={at}
        className="shrink-0 font-mono tabular-nums text-ink-ghost"
      >
        {timeOf(new Date(at), locale)}
      </time>
    </Link>
  );
}

/** One side of a match: faces on top, names under them, so the card reads as
 *  two people rather than as two rows of text. */
function Side({
  ids,
  names,
  won,
}: {
  /** Null where the column is empty, undefined where singles skips the slot. */
  ids: (number | null | undefined)[];
  names: (string | null | undefined)[];
  won: boolean;
}) {
  const { byId } = usePlayerLookup();
  // Singles pass an empty second slot; a doubles row missing its partner name
  // drops the same way rather than rendering a blank face.
  const people = ids
    .map((id, i) => ({
      id,
      name: names[i],
      url: id == null ? undefined : byId.get(id)?.avatar_url,
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

function MatchCard({
  game,
  tournament,
}: {
  game: Game;
  /** Set when the game was filed as a tournament fixture. */
  tournament?: Pick<Tournament, "id" | "name">;
}) {
  const { t, locale } = useT();

  const isDoubles = game.mode === "doubles";
  const p1 = game.player_1_score;
  const p2 = game.player_2_score;

  return (
    <>
      {/* A fixture belongs to its bracket first: the card says so before it says
          anything about the score. */}
      {tournament && (
        <Link
          to={`/app/tournaments/${tournament.id}`}
          className="mb-2 flex items-center gap-1.5 border-b border-hairline pb-2 text-caption font-medium text-ink-soft transition-colors duration-150 hover:text-strike"
        >
          <LuTrophy className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{tournament.name}</span>
        </Link>
      )}

      <div className="flex items-baseline justify-between gap-3">
        <p className="text-caption font-medium uppercase tracking-[0.08em] text-ink-ghost">
          {isDoubles ? t("games.doubles") : t("games.single")}
        </p>
        <time
          dateTime={game.created_at}
          className="shrink-0 font-mono text-caption tabular-nums text-ink-ghost"
        >
          {timeOf(new Date(game.created_at), locale)}
        </time>
      </div>

      {/* The score is the focal element; the two sides mirror around it, so the
          winner reads as weight rather than as a colour. */}
      <div className="mt-3 flex items-center gap-3">
        <Side
          ids={[game.player_1_id, isDoubles ? game.player_1b_id : undefined]}
          names={[
            game.player_1_name,
            isDoubles ? game.player_1b_name : undefined,
          ]}
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
          names={[
            game.player_2_name,
            isDoubles ? game.player_2b_name : undefined,
          ]}
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
  } = useGetGames({
    pageSize: limit,
  });
  const { data: logs } = useGetDrillLogs({ limit });
  const { data: players } = useGetPlayers();
  const { data: drills } = useGetDrills();
  const { data: tournaments } = useGetTournaments();

  // drill_logs carries no club_id — someone in two clubs can read both sets, so
  // the club's own roster is what scopes them.
  const roster = new Set((players ?? []).map((p) => p.id));

  const games = gamesData?.games ?? [];
  const { data: gameTournaments } = useGameTournaments(games.map((g) => g.id));

  // Entries are open: an invitation, not something that happened, so it sits
  // above the timeline instead of sinking down it.
  const open = (tournaments ?? []).filter((x) => x.status === "open");

  /** A finished tournament belongs to the day its last game was played, not to
   *  the day somebody created it — a month-long league would otherwise announce
   *  its result at the bottom of the feed. Only the games in view are known
   *  here, so a final played further back falls back to the creation date. */
  const endedAt = (tournament: Tournament) =>
    games
      .filter((g) => gameTournaments?.get(g.id)?.id === tournament.id)
      .reduce(
        (latest, g) => (g.created_at > latest ? g.created_at : latest),
        "",
      ) || tournament.created_at;

  const items: FeedItem[] = [
    ...games.map((game) => ({ at: game.created_at, game })),
    ...(logs ?? [])
      .filter((log) => roster.has(log.player_id))
      .map((log) => ({ at: log.created_at, log })),
    // drills are shared across clubs, so every club sees a new one written.
    // The sort and the slice below keep the old library out of the way.
    ...(drills ?? []).map((drill) => ({ at: drill.created_at, drill })),
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
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);

  // A full window means there may be more behind it; a short one is the end of
  // the club's history.
  const hasMore = items.length >= limit;

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

  if (isLoading) return <SkeletonRows rows={6} />;

  return (
    <div className="space-y-3">
      {/* The one card in the feed asking for something back, so it is the one
          carrying the accent — everything else here is a record of what already
          happened. Raised surface too: it is not part of the timeline below. */}
      {open.map((tournament) => (
        <Card
          key={`o${tournament.id}`}
          className="border-l-2 border-l-strike bg-felt-raised px-4 py-3"
        >
          <TournamentOpenCard tournament={tournament} />
        </Card>
      ))}

      {items.length === 0 && (
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

        const key = item.game
          ? `g${item.game.id}`
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
              >
                {dayLabel(date, t, locale)}
              </h3>
            )}
            {/* Three weights, so the feed reads as a feed and not as a stack of
                identical boxes: a result gets a card, because the conversation
                under it belongs to that result; a finished tournament gets the
                lamp on it; an announcement gets neither. */}
            {item.drill ? (
              <DrillCreatedRow drill={item.drill} at={item.at} />
            ) : item.tournament && item.tournament.status !== "done" ? (
              <CreatedRow
                icon={<LuTrophy className="h-3.5 w-3.5" aria-hidden />}
                label={t("tournaments.new")}
                name={item.tournament.name}
                to={`/app/tournaments/${item.tournament.id}`}
                at={item.at}
              />
            ) : (
              <Card
                className={
                  item.tournament
                    ? "spot overflow-hidden px-4 py-3"
                    : "px-4 py-3"
                }
              >
                {item.game ? (
                  <MatchCard
                    game={item.game}
                    tournament={gameTournaments?.get(item.game.id)}
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
