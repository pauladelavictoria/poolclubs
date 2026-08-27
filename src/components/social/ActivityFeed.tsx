import { useEffect, useRef, useState, type ReactNode } from "react";
import { LuActivity, LuChevronRight, LuTrophy } from "react-icons/lu";
import PoolTableDiagram from "@/components/drills/PoolTableDiagram";
import SocialBar from "@/components/social/SocialBar";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Segmented } from "@/components/ui/Segmented";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useGetGames } from "@/hooks/useGetGames";
import { useGetDrillLogs } from "@/hooks/useGetDrillLogs";
import { useGetPlayers, usePlayerLookup } from "@/hooks/useGetPlayers";
import { useGetDrills } from "@/hooks/useGetDrills";
import { useGetTournaments, useGameTournaments } from "@/hooks/useTournaments";
import { TournamentResultCard } from "@/components/tournaments/TournamentFeedCard";
import { scoreBand, scorePct } from "@/libs/scoreBand";
import { dayLabel, startsNewDay, timeOf } from "@/libs/dayLabel";
import { groupTournamentRuns } from "@/libs/feedGroups";
import type { Drill, DrillLog, Game, Tournament } from "@/types";
import { useT } from "@/i18n";
import type { LinkProps } from "@tanstack/react-router";
import { AppLink } from "@/components/layout/AppLink";
import { DRILLS_ENABLED } from "@/libs/features";

/** One row of the club's history: a match, a logged drill, or one of the two
 *  things that get created rather than played — a drill or a tournament. */
type FeedItem = {
  at: string;
  /** One match, or the run of fixtures one tournament night produced. */
  games?: Game[];
  log?: DrillLog;
  drill?: Drill;
  tournament?: Tournament;
};

/** What the filter above the feed sorts rows into — one kind per row shape, so
 *  every row in the feed answers to exactly one tab. */
type FeedKind =
  "all" | "matches" | "newDrills" | "drillResults" | "tournaments";

/** Two rows can share an instant, and one pair always does: a finished
 *  tournament is dated by its last fixture, which is a row of its own. Sorting
 *  by time alone leaves that tie to the order the lists were merged in, which
 *  put the fixture above the result it produced. The conclusion goes first. */
const rank = (item: FeedItem) => (item.tournament ? 0 : 1);

/** How many fixtures a grouped tournament card lists before handing over to the
 *  tournament's own page. */
const GROUP_ROWS = 5;

const kindOf = (item: FeedItem): Exclude<FeedKind, "all"> =>
  item.games
    ? "matches"
    : item.drill
      ? "newDrills"
      : item.log
        ? "drillResults"
        : "tournaments";

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

/** A drill that was written. Same dashed weight as the row below it, but the
 *  table itself is the drill — a name alone says nothing about what you would
 *  be setting up. */
function DrillCreatedRow({ drill, at }: { drill: Drill; at: string }) {
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
  params,
  at,
}: {
  icon: ReactNode;
  label: string;
  name: string;
  to: LinkProps["to"];
  params?: Record<string, string | number>;
  at: string;
}) {
  const { locale } = useT();

  return (
    <AppLink
      to={to}
      params={params}
      className="flex items-center gap-2.5 rounded-card border border-dashed border-hairline px-3 py-2 text-caption transition-colors duration-150 hover:border-hairline-strong hover:bg-felt"
    >
      <span className="shrink-0">{icon}</span>
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
    </AppLink>
  );
}

/** One side of a match: faces on top, names under them, so the card reads as
 *  two people rather than as two rows of text. */
function Side({
  ids,
  won,
}: {
  /** Null where the column is empty, undefined where singles skips the slot. */
  ids: (number | null | undefined)[];
  won: boolean;
}) {
  const { byId } = usePlayerLookup();
  // The name comes from the same lookup as the face. Games used to carry a copy
  // of it; they carry only the id since names moved to people.
  //
  // Singles pass an empty second slot, and a player the lookup has not got —
  // someone removed from the roster — drops the same way rather than rendering
  // a blank face.
  const people = ids
    .map((id) => (id == null ? null : byId.get(id)))
    .filter((player) => !!player)
    .map((player) => ({
      id: player.id,
      name: player.name,
      url: player.avatar_url,
    }));

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <div className="flex -space-x-3">
        {people.map((person, i) => (
          <Avatar
            key={i}
            name={person.name}
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
        {people.map((p, i) => (
          <span key={p.id}>
            {i > 0 && " / "}
            <AppLink
              to="/app/$clubSlug/players/$playerId"
              params={{ playerId: p.id }}
              className="transition-colors duration-150 hover:text-strike"
            >
              {p.name}
            </AppLink>
          </span>
        ))}
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
        <AppLink
          to="/app/$clubSlug/tournaments/$tournamentId"
          params={{ tournamentId: tournament.id }}
          className="mb-2 flex items-center gap-1.5 border-b border-hairline pb-2 text-caption font-medium text-ink-soft transition-colors duration-150 hover:text-strike"
        >
          <LuTrophy className="h-3.5 w-3.5 shrink-0 text-strike" />
          <span className="truncate">{tournament.name}</span>
        </AppLink>
      )}

      <div className="flex items-baseline justify-between gap-3">
        <p className="text-caption font-medium uppercase tracking-[0.08em] text-strike">
          {isDoubles ? t("games.doubles") : t("games.single")}
        </p>
        <time
          dateTime={game.played_at}
          className="shrink-0 font-mono text-caption tabular-nums text-ink-ghost"
        >
          {timeOf(new Date(game.played_at), locale)}
        </time>
      </div>

      {/* The score is the focal element; the two sides mirror around it, so the
          winner reads as weight rather than as a colour. */}
      <div className="mt-3 flex items-center gap-3">
        <Side
          ids={[game.player_1_id, isDoubles ? game.player_1b_id : undefined]}
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
 * A tournament night: the fixtures it produced under one heading, in the same
 * running-order shape the tournament's own list view uses — names either side of
 * the score, one line each. Faces and a big score per fixture would turn an
 * evening of eight matches into eight screens of feed.
 *
 * Each fixture still carries its own reactions and comments: the conversation
 * belongs to the match somebody played, not to the night.
 */
function TournamentGamesCard({
  games,
  tournament,
}: {
  games: Game[];
  tournament: Pick<Tournament, "id" | "name">;
}) {
  const { t, locale } = useT();
  // Names come from the roster, not from the game: see the note in Side.
  const { byId } = usePlayerLookup();
  const nameOf = (id: number | null) =>
    (id == null ? undefined : byId.get(id)?.name) ?? "";

  // Past five fixtures the card stops being a feed row and starts being the
  // tournament page done worse — so the rest is a link to the real thing.
  const shown = games.slice(0, GROUP_ROWS);
  const rest = games.length - shown.length;

  return (
    <>
      <AppLink
        to="/app/$clubSlug/tournaments/$tournamentId"
        params={{ tournamentId: tournament.id }}
        className="mb-2 flex items-baseline gap-1.5 border-b border-hairline pb-2 text-caption font-medium text-ink-soft transition-colors duration-150 hover:text-strike"
      >
        <LuTrophy className="h-3.5 w-3.5 shrink-0 self-center text-strike" />
        <span className="min-w-0 flex-1 truncate">{tournament.name}</span>
        <span className="shrink-0 font-mono tabular-nums text-ink-ghost">
          {t("games.count", { n: games.length })}
        </span>
      </AppLink>

      <ul className="divide-y divide-hairline">
        {shown.map((game) => {
          const isDoubles = game.mode === "doubles";
          const p1 = game.player_1_score;
          const p2 = game.player_2_score;
          const side = (won: boolean) =>
            won ? "font-semibold text-ink" : "text-ink-faint";

          return (
            <li key={game.id} className="py-2 first:pt-0 last:pb-0">
              {/* Names share the leftover width evenly, so a long one cannot
                  push the score off centre. */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <span
                  className={`min-w-0 truncate text-right text-body ${side(p1 > p2)}`}
                >
                  <AppLink
                    to="/app/$clubSlug/players/$playerId"
                    params={{ playerId: game.player_1_id }}
                    className="transition-colors duration-150 hover:text-strike"
                  >
                    {nameOf(game.player_1_id)}
                  </AppLink>
                  {isDoubles && game.player_1b_id != null && (
                    <>
                      {" / "}
                      <AppLink
                        to="/app/$clubSlug/players/$playerId"
                        params={{ playerId: game.player_1b_id }}
                        className="transition-colors duration-150 hover:text-strike"
                      >
                        {nameOf(game.player_1b_id)}
                      </AppLink>
                    </>
                  )}
                </span>
                <span className="shrink-0 font-mono text-body font-semibold tabular-nums">
                  <span className={p1 > p2 ? "text-ink" : "text-ink-faint"}>
                    {p1}
                  </span>
                  <span className="px-1 text-ink-ghost">-</span>
                  <span className={p2 > p1 ? "text-ink" : "text-ink-faint"}>
                    {p2}
                  </span>
                </span>
                <span className={`min-w-0 truncate text-body ${side(p2 > p1)}`}>
                  <AppLink
                    to="/app/$clubSlug/players/$playerId"
                    params={{ playerId: game.player_2_id }}
                    className="transition-colors duration-150 hover:text-strike"
                  >
                    {nameOf(game.player_2_id)}
                  </AppLink>
                  {isDoubles && game.player_2b_id != null && (
                    <>
                      {" / "}
                      <AppLink
                        to="/app/$clubSlug/players/$playerId"
                        params={{ playerId: game.player_2b_id }}
                        className="transition-colors duration-150 hover:text-strike"
                      >
                        {nameOf(game.player_2b_id)}
                      </AppLink>
                    </>
                  )}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <time
                  dateTime={game.played_at}
                  className="shrink-0 pl-1 font-mono text-caption tabular-nums text-ink-ghost"
                >
                  {timeOf(new Date(game.played_at), locale)}
                </time>
                <div className="min-w-0 flex-1">
                  <SocialBar target={{ gameId: game.id }} preview />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {rest > 0 && (
        <AppLink
          to="/app/$clubSlug/tournaments/$tournamentId"
          params={{ tournamentId: tournament.id }}
          className="mt-2 flex items-center justify-between gap-2 border-t border-hairline pt-2 text-caption font-medium text-ink-soft transition-colors duration-150 hover:text-strike"
        >
          <span className="min-w-0 truncate">
            {t("feed.moreGames", { n: rest })}
          </span>
          <LuChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        </AppLink>
      )}
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
  const [kind, setKind] = useState<FeedKind>("all");
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

  const filtered = merged.filter(
    (item) => kind === "all" || kindOf(item) === kind,
  );

  const items = groupTournamentRuns(
    filtered,
    (game) => gameTournaments?.get(game.id)?.id,
  );

  // A full window means there may be more behind it; a short one is the end of
  // the club's history. Measured before the filter: a filtered feed of three
  // rows still has the rest of the history behind it, and scrolling has to keep
  // widening the window to reach it.
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
      {/* Title and filter on one line, drawn before the rows load: the heading
          is the section, and a section that appears late shifts the page under
          whoever is already reading it. Wrapping rather than shrinking — five
          tabs and a heading do not both fit on a phone, and a squeezed tab strip
          reads worse than a second line. The strip scrolls inside its own box
          past that, so the page itself never scrolls sideways. */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
        <h2 className="text-h4 font-semibold text-ink">
          {t("dashboard.activity")}
        </h2>
        <div className="-mx-1 max-w-full overflow-x-auto px-1 py-0.5">
          <Segmented<FeedKind>
            value={kind}
            onChange={setKind}
            label={t("feed.filter")}
            options={[
              { value: "all", label: t("feed.all") },
              { value: "matches", label: t("feed.matchResults") },
              ...(DRILLS_ENABLED
                ? [
                    { value: "newDrills" as const, label: t("feed.newDrills") },
                    {
                      value: "drillResults" as const,
                      label: t("feed.drillResults"),
                    },
                  ]
                : []),
              { value: "tournaments", label: t("feed.tournamentResults") },
            ]}
          />
        </div>
      </div>

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
                lamp on it; an announcement gets neither. */}
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
                    ? "spot overflow-hidden px-4 py-3"
                    : "px-4 py-3"
                }
              >
                {item.games ? (
                  <MatchCard
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
