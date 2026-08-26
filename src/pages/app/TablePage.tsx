import { useState } from "react";
import { getRouteApi, Navigate } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { LuMonitorSmartphone } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useClubTables } from "@/hooks/useClubTables";
import { useLiveMatches, useManageLiveMatch } from "@/hooks/useLiveMatch";
import Scoreboard from "@/components/live/Scoreboard";
import StartMatchForm from "@/components/live/StartMatchForm";
import { AppLink, useAppNavigate } from "@/components/layout/AppLink";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { dialogClasses } from "@/components/ui/cardStyles";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useDialog } from "@/libs/useDialog";
import { pinKiosk, readKioskTable } from "@/libs/kiosk";
import { liveWriteMessage } from "@/libs/dbError";
import { useT } from "@/i18n";

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
  const id = Number(tableId);
  const { player, isClubAdmin } = useAuth();
  const { data: tables, isLoading } = useClubTables();
  const { data: live } = useLiveMatches();
  const { data: players } = useGetPlayers();
  const { startMatch } = useManageLiveMatch();
  const appNavigate = useAppNavigate();

  const [starting, setStarting] = useState(false);
  const dialogRef = useDialog(starting);
  const close = () => setStarting(false);

  if (isLoading) return <PageSkeleton />;

  const table = (tables ?? []).find((tbl) => tbl.id === id);
  if (!table)
    return (
      <div className="p-6 text-center text-body text-ink-faint">
        {t("tables.gone")}
      </div>
    );

  const match = (live ?? []).find((m) => m.table_id === id);
  const roster = players ?? [];
  const seat = (seatId: number | null) =>
    seatId === null ? undefined : roster.find((p) => p.id === seatId);
  const pinned = readKioskTable() === id;

  // A pinned tablet is this table's scorer, not its audience. Watch mode is for
  // somebody who opened the table from the list on their own phone; the device
  // on the rail belongs on the screen with the buttons, and there is no tap
  // between the two worth asking a player mid-rack for.
  if (pinned && match)
    return (
      <Navigate
        to="/app/$clubSlug/live/$liveId"
        params={{ clubSlug, liveId: match.id }}
        replace
      />
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
        <div className="flex min-h-0 flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-sm space-y-4 p-5">
            <div>
              <p className="text-caption font-medium uppercase tracking-wide text-ink-faint">
                {t("tables.free")}
              </p>
              <h2 className="mt-1 text-h3 font-semibold text-ink">
                {table.label}
              </h2>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStarting(true)} disabled={!player}>
                {t("live.playHere")}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <dialog
        ref={dialogRef}
        className={dialogClasses({ wide: true })}
        aria-label={t("live.start")}
        onClose={close}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        {starting && player && (
          <StartMatchForm
            me={player}
            // A pinned tablet is scoring for whoever is standing at it, and the
            // device account is one of the seats the database will accept — so
            // the roster it offers is everyone but itself, the same as a phone.
            opponents={roster.filter((p) => p.id !== player.id)}
            table={table}
            onSubmit={(values) =>
              startMatch.mutate(
                {
                  player1: values.player1,
                  player2: values.player2,
                  partner1: values.partner1,
                  partner2: values.partner2,
                  tableId: values.tableId,
                  discipline: values.discipline,
                  raceTo: values.raceTo,
                },
                {
                  onSuccess: (row) => {
                    close();
                    appNavigate("/app/$clubSlug/live/$liveId", {
                      liveId: row.id,
                    });
                  },
                  onError: (err) => toast.error(t(liveWriteMessage(err, "startMatch"))),
                },
              )
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
