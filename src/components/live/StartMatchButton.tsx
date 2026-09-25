import { useState } from "react";
import { toast } from "react-toastify";
import { LuPlay } from "react-icons/lu";
import StartMatchForm from "@/components/live/StartMatchForm";
import { useAppNavigate } from "@/components/layout/AppLink";
import { Button } from "@/components/ui/Button";
import { dialogClasses } from "@/components/ui/cardStyles";
import { useAuth } from "@/hooks/useAuth";
import { useClubTables } from "@/hooks/useClubTables";
import { useDialog } from "@/hooks/useDialog";
import { useLiveMatches, useManageLiveMatch } from "@/hooks/useLiveMatch";
import { usePlayers } from "@/hooks/usePlayers";
import { useLeagueFixtures } from "@/hooks/useTournaments";
import { START_MATCH_KEYS, dbErrorMessage } from "@/libs/algorithms/dbError";
import { useT } from "@/i18n";

/**
 * "Start match" from the lobby: the table's start form, with the table as a
 * question rather than a given, and straight to the scoreboard once it is on.
 *
 * The league toggle is the form's own — a pair with a pending fixture is
 * offered it, same as at a table.
 */
export default function StartMatchButton({
  className,
}: {
  className?: string;
}) {
  const { t } = useT();
  const { player } = useAuth();
  const { data: players } = usePlayers();
  const { data: tables } = useClubTables();
  const { data: live } = useLiveMatches();
  const { data: leagueFixtures } = useLeagueFixtures();
  const { startMatch } = useManageLiveMatch();
  const appNavigate = useAppNavigate();
  const [starting, setStarting] = useState(false);
  const dialogRef = useDialog(starting);
  const close = () => setStarting(false);

  if (!player) return null;

  const busy = new Set(
    (live ?? []).flatMap((m) => (m.table_id === null ? [] : [m.table_id])),
  );

  return (
    <>
      <Button
        variant="secondary"
        className={className}
        onClick={() => setStarting(true)}
      >
        <LuPlay className="h-4 w-4" aria-hidden />
        {t("live.start")}
      </Button>

      <dialog
        ref={dialogRef}
        className={dialogClasses({ wide: true })}
        aria-label={t("live.start")}
        onClose={close}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        {starting && (
          <StartMatchForm
            me={player}
            opponents={(players ?? []).filter((p) => p.id !== player.id)}
            tables={tables ?? []}
            busyTableIds={busy}
            leagueFixtures={leagueFixtures}
            onSubmit={(values) =>
              startMatch.mutate(values, {
                onSuccess: (row) => {
                  close();
                  appNavigate("/app/$clubSlug/live/$liveId", {
                    liveId: row.id,
                  });
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
    </>
  );
}
