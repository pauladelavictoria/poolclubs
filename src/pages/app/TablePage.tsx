import { useEffect, useState } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { LuMonitorSmartphone } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { usePlayers } from "@/hooks/usePlayers";
import { useClubTables } from "@/hooks/useClubTables";
import { useLiveMatches, useManageLiveMatch } from "@/hooks/useLiveMatch";
import { useNightOn } from "@/hooks/useNight";
import { useStreamedTableIds } from "@/hooks/useClubYoutube";
import { useLeagueFixtures } from "@/hooks/useTournaments";
import { seatsOfGroup, useSuggestions } from "@/hooks/useSuggestions";
import Scoreboard from "@/components/live/Scoreboard";
import StartMatchForm from "@/components/live/StartMatchForm";
import SuggestedGroup from "@/components/live/SuggestedGroup";
import DrillWeekBoard from "@/components/drills/DrillWeekBoard";
import PoolTableDiagram from "@/components/drills/PoolTableDiagram";
import PlayerPicker from "@/components/players/PlayerPicker";
import { useDrillOfWeek } from "@/hooks/useDrillOfWeek";
import { DRILLS_ENABLED } from "@/libs/algorithms/features";
import { AppLink, useAppNavigate } from "@/components/layout/AppLink";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { dialogClasses } from "@/components/ui/cardStyles";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { useDialog, useLingering } from "@/hooks/useDialog";
import { pinKiosk, readKioskTable } from "@/libs/browser/kiosk";
import { readTodaySetup } from "@/libs/prefs";
import { seatsNeeded } from "@/libs/algorithms/today";
import { START_MATCH_KEYS, dbErrorMessage } from "@/libs/algorithms/dbError";
import { useT } from "@/i18n";
import type { Player } from "@/types";
import type { LeagueFixture } from "@/queries/tournaments";

const route = getRouteApi("/app/_authed/$clubSlug/tables/$tableId");

/**
 * One table, and whatever is on it.
 *
 * The same page whether you opened it from the list or it is the only thing a
 * tablet on the rail has ever shown — the difference is the chrome around it,
 * which the club layout drops when this device is pinned here. So there is one
 * layout, not a kiosk copy of one.
 */
export default function TablePage() {
  const { t } = useT();
  const { clubSlug, tableId } = route.useParams();
  const navigate = useNavigate();
  const [pickingShooter, setPickingShooter] = useState(false);
  const id = Number(tableId);
  const { player, isClubAdmin } = useAuth();
  const { data: tables, isLoading } = useClubTables();
  const { data: live } = useLiveMatches();
  const { data: players } = usePlayers();
  const { startMatch } = useManageLiveMatch();
  const { data: streamedTableIds } = useStreamedTableIds();
  const { data: leagueFixtures } = useLeagueFixtures();
  const appNavigate = useAppNavigate();
  const weekly = useDrillOfWeek();

  // The club's setting as it stands. Read, not owned: /night is where it is
  // changed, and a table arguing with it would be a second answer.
  const setup = readTodaySetup();
  const seats = seatsNeeded(setup);
  /** Whether this table has a match on it, asked before the roster has loaded
   *  so the suggestion can be skipped while one is being played — the hook is at
   *  the top of the component and the pairing is not free. */
  const busy = (live ?? []).some((m) => m.table_id === id);
  // The pairing is the ranking night's own answer to whose turn it is, so it is
  // offered on a night and not on an ordinary afternoon — see useNightOn. An
  // admin calling the night is what turns it back on.
  const nightOn = useNightOn();
  // Who the night says is next on *this* table. Positional, and derived from the
  // same list every other screen reads, so no two tables offer the same pair —
  // see hooks/useSuggestions.
  const { groupFor, canStart } = useSuggestions({
    setup,
    enabled: !busy && nightOn,
  });

  /** The start form, and what it is being started as: a league's fixture, or a
   *  game of nobody's but the two players'. */
  const [starting, setStarting] = useState<{
    league?: LeagueFixture["tournament"];
  } | null>(null);
  const dialogRef = useDialog(starting !== null);
  // Kept through the close animation — see useLingering.
  const shownStarting = useLingering(starting);
  const close = () => setStarting(null);

  const match = (live ?? []).find((m) => m.table_id === id);
  const pinned = readKioskTable() === id;

  // Pinned, this table's tablet belongs on the scoreboard the moment a match
  // lands on it — its own, or one started from someone else's phone. An
  // effect, not a rendered <Navigate>: that component reads "should I
  // navigate" off its whole props object by reference (see useNavigate.js),
  // which JSX recreates on every render regardless of what's inside it, so
  // it renavigates every single render — a tight loop with no error in it
  // anywhere. An effect keyed on the match id only fires when the id itself
  // changes, which is the actual question here.
  useEffect(() => {
    if (pinned && match) {
      appNavigate("/app/$clubSlug/live/$liveId", { liveId: match.id });
    }
    // appNavigate is a fresh closure every render (useAppNavigate does not
    // memoize it); only pinned-ness and which match matter for when this
    // should fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned, match?.id]);

  if (isLoading) return <PageSkeleton />;

  const table = (tables ?? []).find((tbl) => tbl.id === id);
  if (!table)
    return (
      <div className="p-6 text-center text-body text-ink-faint">
        {t("tables.gone")}
      </div>
    );

  // The effect above is already on its way to the scoreboard; nothing here
  // is worth painting for the one frame before it lands.
  if (pinned && match) return null;

  const roster = players ?? [];
  /** Every league still running with a fixture left in it. Derived from the
   *  fixtures the form needs anyway rather than a second query: a league with
   *  nothing left to play is not one to offer a table to. */
  const leagues = [
    ...new Map(
      (leagueFixtures ?? []).map((f) => [f.tournament.id, f.tournament]),
    ).values(),
  ];

  /** The tap that starts a match is also the club's one reliable user gesture,
   *  so it is what takes the browser's chrome away.
   *
   *  ponytail: document fullscreen, not the kiosk shell — nothing here has that
   *  ref, and the shell already fills the screen.
   *
   *  Awaited, and only then the dialog: the top layer paints in the order
   *  things entered it, so a fullscreen element that arrives *after*
   *  showModal() covers the dialog with the page. */
  const open = async (league?: LeagueFixture["tournament"]) => {
    await document.documentElement.requestFullscreen?.().catch(() => {});
    setStarting({ league });
  };

  const seat = (seatId: number | null) =>
    seatId === null ? undefined : roster.find((p) => p.id === seatId);
  const next = groupFor(id);

  // Unpinned, there is no reactive redirect above to fall back on — this is
  // the only way there.
  const goLive = (liveId: string) => {
    if (!pinned) appNavigate("/app/$clubSlug/live/$liveId", { liveId });
  };

  /** The offer, taken. Same shape as every other way a match is started, so the
   *  row the button makes is the match the names above it described. */
  const startNext = (group: Player[]) =>
    startMatch.mutate(
      {
        ...seatsOfGroup(group, seats),
        tableId: id,
        discipline: setup.discipline,
        raceTo: setup.raceTo,
      },
      {
        // Straight onto the board. A tablet on the rail is where this was
        // tapped, and the next thing anybody wants from it is the score.
        onSuccess: (row) => goLive(row.id),
        onError: (err) =>
          toast.error(t(dbErrorMessage(err, "startMatch", START_MATCH_KEYS))),
      },
    );

  return (
    <div className="flex h-full flex-col">
      {/* Pinned, the bar above already carries the club, this table and the way
          to unpin — so the page is content only. Unpinned, this is a page like
          any other and needs its own name. */}
      {!pinned && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-4 py-3">
          <h1 className="truncate text-h3 font-semibold text-ink">
            {table.label}
          </h1>
          <Button
            size="sm"
            variant="ghost"
            className="text-ink-faint"
            onClick={() => {
              if (confirm(t("kiosk.pinConfirm", { name: table.label })))
                pinKiosk(table.id);
            }}
          >
            <LuMonitorSmartphone className="h-4 w-4" aria-hidden />
            {t("kiosk.pin")}
          </Button>
        </div>
      )}

      {match ? (
        <div className="min-h-0 flex-1">
          {/* Read-only here: scoring happens on the match's own screen, which
              is one tap away and is the thing built for a cue in one hand. */}
          <AppLink
            to="/app/$clubSlug/live/$liveId"
            params={{ liveId: match.id }}
            className="block h-full"
          >
            <Scoreboard
              match={match}
              p1={seat(match.player_1_id)}
              p1b={seat(match.player_1b_id)}
              p2={seat(match.player_2_id)}
              p2b={seat(match.player_2b_id)}
              variant="spectate"
            />
          </AppLink>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* The primary card: centred in its column and set larger than the
              drill beside it — a table is for matches first. */}
          <div className="flex shrink-0 items-center justify-center overflow-y-auto p-4 md:min-h-0 md:flex-[3] md:shrink">
            <Card className="w-full max-w-xl space-y-5 p-6">
              <h2 className="text-h2 font-semibold text-ink">
                {t("live.start")}
              </h2>

              {/* Whoever the night has put on this table, already here rather than
                waiting for somebody to walk over and pick from a list. This is
                the whole of "the next players appear on the tablet": the row is
                deleted when the last match was filed, realtime says so, and the
                card below fills itself in.

                Still an offer and never an auto-start — see the note in
                LiveMatchPage. */}
              {next && (
                <div className="space-y-3">
                  <p className="text-caption font-medium uppercase tracking-wide text-ink-faint">
                    {t("night.nextUp")}
                  </p>
                  <SuggestedGroup group={next} seats={seats} />
                  {canStart(next) && (
                    <Button
                      className="w-full"
                      disabled={startMatch.isPending}
                      onClick={() => startNext(next)}
                    >
                      {t("night.startOn", { name: table.label })}
                    </Button>
                  )}
                </div>
              )}

              {/* Kept whatever the offer says: the room is allowed to disagree
                with the queue, and somebody who has just walked in is not in it
                at all yet. One button per league — clubs run one — beside the
                plain game; the night's offer above, when there is one, is the
                primary. */}
              <div className="flex flex-col gap-3">
                {leagues.map((league) => (
                  <Button
                    key={league.id}
                    className="h-14 w-full text-h4"
                    variant={next ? "secondary" : "primary"}
                    onClick={() => void open(league)}
                    disabled={!player}
                  >
                    {t("live.playForLeague", { name: league.name })}
                  </Button>
                ))}
                <Button
                  className="h-14 w-full text-h4"
                  variant={
                    next
                      ? "ghost"
                      : leagues.length > 0
                        ? "secondary"
                        : "primary"
                  }
                  onClick={() => void open()}
                  disabled={!player}
                >
                  {t("live.playHere")}
                </Button>
              </div>
            </Card>
          </div>

          {/* The week's drill, while nobody is playing on it: the leaders are
              the invitation, the button is the way to beat them. Secondary:
              the narrower column behind a rule rather than a card. The button
              stays put; everything above it scrolls. */}
          {DRILLS_ENABLED && weekly.drill && (
            <aside className="flex min-h-0 flex-1 flex-col border-t border-hairline md:flex-[2] md:border-t-0 md:border-l">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                <h2 className="text-caption font-medium uppercase tracking-wide text-ink-faint">
                  {t("drillWeek.title")}
                </h2>
                <div className="space-y-2">
                  <p className="text-body font-medium text-ink">
                    {weekly.drill.name}
                  </p>
                  <PoolTableDiagram
                    ballPositions={weekly.drill.ball_positions}
                    shotPaths={weekly.drill.shot_paths}
                    compact
                    className="shrink-0"
                  />
                </div>
                <DrillWeekBoard
                  drillId={weekly.drill.id}
                  since={weekly.since}
                  limit={5}
                />
              </div>
              <div className="shrink-0 border-t border-hairline p-4">
                <Button
                  className="w-full"
                  variant="secondary"
                  disabled={!player}
                  onClick={() => setPickingShooter(true)}
                >
                  {t("drillWeek.playOnTable")}
                </Button>
              </div>
            </aside>
          )}
        </div>
      )}

      <PlayerPicker
        open={pickingShooter}
        onClose={() => setPickingShooter(false)}
        onPick={(shooter) =>
          navigate({
            to: "/app/$clubSlug/tables/$tableId/drill",
            params: { clubSlug, tableId },
            search: { player: shooter.id },
          })
        }
      />

      <dialog
        ref={dialogRef}
        className={dialogClasses({ wide: true })}
        aria-label={t("live.start")}
        onClose={close}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        {shownStarting && player && (
          <StartMatchForm
            me={player}
            league={shownStarting.league}
            // A pinned tablet is scoring for whoever is standing at it, and the
            // device account is one of the seats the database will accept — so
            // the roster it offers is everyone but itself, the same as a phone.
            opponents={roster.filter((p) => p.id !== player.id)}
            table={table}
            atTable
            streamed={(streamedTableIds ?? []).includes(table.id)}
            leagueFixtures={leagueFixtures}
            onSubmit={(values) =>
              startMatch.mutate(values, {
                onSuccess: (row) => {
                  close();
                  goLive(row.id);
                },
                onError: (err) =>
                  toast.error(
                    t(dbErrorMessage(err, "startMatch", START_MATCH_KEYS)),
                  ),
              })
            }
            onCancel={close}
            isSubmitting={startMatch.isPending}
          />
        )}
      </dialog>

      {isClubAdmin && !pinned && (
        <p className="shrink-0 px-4 pb-3 text-caption text-ink-faint">
          {t("kiosk.hint")}
        </p>
      )}
    </div>
  );
}
