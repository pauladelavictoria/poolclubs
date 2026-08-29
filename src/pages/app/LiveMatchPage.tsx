import { useState } from "react";
import { getRouteApi, Navigate, useNavigate } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { LuExpand, LuTrash2 } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useClubTables } from "@/hooks/useClubTables";
import { useLiveMatch, useManageLiveMatch } from "@/hooks/useLiveMatch";
import { seatsOfGroup, useSuggestions } from "@/hooks/useSuggestions";
import { seatsOf } from "@/libs/night";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { readTodaySetup } from "@/libs/prefs";
import { seatsNeeded } from "@/libs/today";
import Scoreboard from "@/components/live/Scoreboard";
import { AppLink, useAppNavigate } from "@/components/layout/AppLink";
import { Button, IconButton } from "@/components/ui/Button";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useFullscreen } from "@/libs/useFullscreen";
import { readKioskTable } from "@/libs/kiosk";
import { liveWriteMessage } from "@/libs/dbError";
import { useT } from "@/i18n";

const route = getRouteApi("/app/_authed/$clubSlug/live/$liveId");

/**
 * One match, filling the screen.
 *
 * Both players open the same URL on their own phones and both can score — the
 * row is the shared object, so there is no host and no "whose phone is it"
 * question to answer. Anyone else in the club opening it gets the same screen
 * with the taps taken out.
 */
export default function LiveMatchPage() {
  const { t } = useT();
  const { liveId, clubSlug } = route.useParams();
  const navigate = useNavigate();
  const { player, isClubAdmin } = useAuth();
  const { data: players } = useGetPlayers();
  const pinned = readKioskTable() !== null;
  // Polled only there: the tablet on the rail is the one screen that finds out
  // the match is over by nobody telling it.
  const { data: match, isLoading } = useLiveMatch(liveId, { poll: pinned });
  const { bump, unbump, startMatch, finishMatch, abandonMatch } =
    useManageLiveMatch();
  const { data: tables } = useClubTables();
  /** The table this match was on and who was on it, held after the row is gone:
   *  filing deletes it, and the next match wants the same table without the two
   *  who just played it being offered straight back onto it. */
  const [freed, setFreed] = useState<{ tableId: number; seats: number[] } | null>(
    null,
  );
  // The club's setting as it stands. Read, not owned: /today is where it is
  // changed, and a scoreboard arguing with it would be a second answer.
  const setup = readTodaySetup();
  const seats = seatsNeeded(setup);
  // Only once this match has been filed and its table is free. Mid-rack there
  // is nothing on screen to offer, and every score tap re-renders this page —
  // see the note on useSuggestions' `enabled`.
  const { groups, canStart } = useSuggestions({
    setup,
    maxGroups: 1,
    exclude: freed?.seats,
    enabled: freed !== null,
  });
  const { ref, isFullscreen, toggle } = useFullscreen<HTMLDivElement>();
  const appNavigate = useAppNavigate();

  if (isLoading) return <PageSkeleton />;

  // Filed, and this table is free. Whoever the night says is next, on it — an
  // offer and never an auto-start: a match that started itself while both
  // players were at the bar is a ghost row holding a table.
  if (freed !== null) {
    const table = (tables ?? []).find((tbl) => tbl.id === freed.tableId);
    const group = groups[0];

    // Nobody waiting, or the table is gone: there is nothing to offer and this
    // page has no match left to show.
    if (!table || !group)
      return pinned ? (
        <Navigate
          to="/app/$clubSlug/tables/$tableId"
          params={{ clubSlug, tableId: String(freed.tableId) }}
          replace
        />
      ) : (
        <Navigate to="/app/$clubSlug" params={{ clubSlug }} replace />
      );

    return (
      <div className="mx-auto max-w-md px-3 py-8">
        <Card className="space-y-4 p-5">
          <div>
            <p className="text-caption font-medium uppercase tracking-wide text-ink-faint">
              {t("live.nextTitle", { name: table.label })}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex shrink-0 -space-x-2">
                {group.map((p) => (
                  <Avatar
                    key={p.id}
                    name={p.name}
                    url={p.avatar_url}
                    className="h-9 w-9 ring-2 ring-felt"
                  />
                ))}
              </div>
              <p className="min-w-0 text-body font-medium text-ink">
                {seats === 4
                  ? `${group[0].name} & ${group[1].name} — ${group[2].name} & ${group[3].name}`
                  : `${group[0].name} — ${group[1].name}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() =>
                void navigate({ to: "/app/$clubSlug", params: { clubSlug } })
              }
            >
              {t("live.notNow")}
            </Button>
            {canStart(group) && (
              <Button
                disabled={startMatch.isPending}
                onClick={() =>
                  startMatch.mutate(
                    {
                      ...seatsOfGroup(group, seats),
                      tableId: table.id,
                      discipline: setup.discipline,
                      raceTo: setup.raceTo,
                    },
                    {
                      onSuccess: (row) =>
                        void navigate({
                          to: "/app/$clubSlug/live/$liveId",
                          params: { clubSlug, liveId: row.id },
                        }),
                      onError: (err) =>
                        toast.error(t(liveWriteMessage(err, "startMatch"))),
                    },
                  )
                }
              >
                {t("today.startOn", { name: table.label })}
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Finished while this tab was looking at it — the socket sets the row to null
  // rather than leaving the page to refetch a match that no longer exists.
  //
  // A pinned tablet gets no such screen. Nobody is going to walk over and tap
  // "back home" on it, and home is not where it belongs anyway: it goes to its
  // own table, which is either free or has the next match on it. This is also
  // what catches the abandon it just performed from the bar.
  if (!match && pinned)
    return (
      <Navigate
        to="/app/$clubSlug/tables/$tableId"
        params={{ clubSlug, tableId: String(readKioskTable()) }}
        replace
      />
    );

  if (!match)
    return (
      <div className="mx-auto max-w-3xl px-3 py-4">
        <EmptyState
          title={t("live.overTitle")}
          hint={t("live.overHint")}
          action={
            <AppLink to="/app/$clubSlug">
              <Button>{t("live.backHome")}</Button>
            </AppLink>
          }
        />
      </div>
    );

  const roster = players ?? [];
  const seat = (id: number | null) =>
    id === null ? undefined : roster.find((p) => p.id === id);

  // Mirrors can_score_live_match in sql/live-night.sql. The database is the
  // boundary; this is only what decides whether the halves are buttons.
  const canScore =
    isClubAdmin ||
    player?.is_device === true ||
    (player !== undefined && seatsOf(match).includes(player.id));

  /**
   * File it, and optionally rack the same four straight back up.
   *
   * The rematch is a new row rather than a reset of this one: the game that was
   * just played is a result in the feed, and a scoreboard that quietly reused
   * the row would be filing one match and showing another under the same id.
   * It carries no challenge or fixture id — that tie was settled by the match
   * just filed, and a second one against it would close it twice.
   */
  const finish = (rematch = false) =>
    finishMatch.mutate(match.id, {
      onSuccess: () => {
        toast.success(t("games.added"));

        const p1 = seat(match.player_1_id);
        const p2 = seat(match.player_2_id);
        if (rematch && p1 && p2) {
          startMatch.mutate(
            {
              player1: p1,
              player2: p2,
              partner1: seat(match.player_1b_id),
              partner2: seat(match.player_2b_id),
              tableId: match.table_id,
              discipline: match.discipline,
              raceTo: match.race_to,
            },
            {
              onSuccess: (row) =>
                void navigate({
                  to: "/app/$clubSlug/live/$liveId",
                  params: { clubSlug, liveId: row.id },
                }),
              // The result is filed either way; only the next rack failed to
              // start, so this lands on the table's page rather than nowhere.
              onError: (err) => {
                toast.error(t(liveWriteMessage(err, "startMatch")));
                void navigate({ to: "/app/$clubSlug", params: { clubSlug } });
              },
            },
          );
          return;
        }

        // Hand the table straight on. A table that goes back to a home page
        // after every result is a table somebody has to come and restart, and on
        // a club night that is the difference between four matches and six.
        if (match.table_id !== null) {
          setFreed({ tableId: match.table_id, seats: seatsOf(match) });
          return;
        }
        void navigate({ to: "/app/$clubSlug", params: { clubSlug } });
      },
      // Usually the other phone pressed Finish half a second earlier, which is
      // exactly what the row lock is there to make harmless.
      onError: () => toast.error(t("live.finishError")),
    });

  // Only reachable when the device is not pinned: a pinned tablet abandons from
  // the bar that names its table — see KioskBar.
  const abandon = () =>
    abandonMatch.mutate(match.id, {
      // The row is gone, so this page has nothing left to show.
      onSuccess: () => appNavigate("/app/$clubSlug"),
      onError: (err) => toast.error(t(liveWriteMessage(err, "abandonMatch"))),
    });

  return (
    <div ref={ref} className="relative h-full bg-felt">
      {/* Over the board, not above it. A strip of its own took height off the
          top of the screen, which pushed both numerals and both sets of
          controls below the middle of the display and cut the spine short of
          the top edge. The board is the page; these two are laid on it.

          Nothing at all on a pinned tablet: the bar above it owns fullscreen
          and abandoning too. */}
      {!pinned && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-3 py-2">
          {/* Destructive and rarely wanted, so it is the quietest thing on the
              screen — the scoreboard under it is what this page is for. */}
          {canScore ? (
            <ConfirmButton
              size="sm"
              variant="ghost"
              onConfirm={abandon}
              confirmLabel={t("live.abandonConfirm")}
              className="pointer-events-auto text-ink-faint"
            >
              <LuTrash2 className="h-4 w-4" aria-hidden />
              {t("live.abandon")}
            </ConfirmButton>
          ) : (
            <span />
          )}
          <IconButton
            label={isFullscreen ? t("common.close") : t("ranking.tvMode")}
            onClick={toggle}
            className="pointer-events-auto"
          >
            <LuExpand className="h-5 w-5" aria-hidden />
          </IconButton>
        </div>
      )}

      <Scoreboard
        match={match}
        p1={seat(match.player_1_id)}
        p1b={seat(match.player_1b_id)}
        p2={seat(match.player_2_id)}
        p2b={seat(match.player_2b_id)}
        variant={canScore ? "play" : "spectate"}
        onBump={(side) => bump(match, side)}
        onUnbump={(side) => unbump(match, side)}
        onFinish={() => finish()}
        // A bracket fixture is played once; anything else, the same four
        // usually want another rack and the club night is the whole point.
        onFinishAndRematch={
          match.tournament_match_id === null ? () => finish(true) : undefined
        }
        isFinishing={finishMatch.isPending || startMatch.isPending}
      />
    </div>
  );
}
