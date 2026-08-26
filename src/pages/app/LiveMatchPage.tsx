import { getRouteApi, Navigate, useNavigate } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { LuExpand, LuTrash2 } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useLiveMatch, useManageLiveMatch } from "@/hooks/useLiveMatch";
import { seatsOf } from "@/libs/night";
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
  const { bump, unbump, finishMatch, abandonMatch } = useManageLiveMatch();
  const { ref, isFullscreen, toggle } = useFullscreen<HTMLDivElement>();
  const appNavigate = useAppNavigate();

  if (isLoading) return <PageSkeleton />;

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

  const finish = () =>
    finishMatch.mutate(match.id, {
      onSuccess: () => {
        toast.success(t("games.added"));
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
    <div ref={ref} className="flex h-full flex-col bg-felt">
      {/* Nothing at all on a pinned tablet: the bar above it owns fullscreen
          and now abandoning too, and a strip holding one button is a second
          header on the one screen that wants the whole display. */}
      {!pinned && (
        <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
          {/* Destructive and rarely wanted, so it is the quietest thing on the
              screen — the scoreboard below is what this page is for. */}
          {canScore ? (
            <ConfirmButton
              size="sm"
              variant="ghost"
              onConfirm={abandon}
              confirmLabel={t("live.abandonConfirm")}
              className="text-ink-faint"
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
          >
            <LuExpand className="h-5 w-5" aria-hidden />
          </IconButton>
        </div>
      )}

      <div className="min-h-0 flex-1">
        <Scoreboard
          match={match}
          p1={seat(match.player_1_id)}
          p1b={seat(match.player_1b_id)}
          p2={seat(match.player_2_id)}
          p2b={seat(match.player_2b_id)}
          variant={canScore ? "play" : "spectate"}
          onBump={(side) => bump(match, side)}
          onUnbump={(side) => unbump(match, side)}
          onFinish={finish}
          isFinishing={finishMatch.isPending}
        />
      </div>
    </div>
  );
}
