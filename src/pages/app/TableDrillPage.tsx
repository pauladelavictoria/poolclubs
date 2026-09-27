import { useEffect, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { usePlayers } from "@/hooks/usePlayers";
import { useLiveMatches } from "@/hooks/useLiveMatch";
import { useAddDrillLog } from "@/hooks/useAddDrillLog";
import { useDrillOfWeek } from "@/hooks/useDrillOfWeek";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useAppNavigate } from "@/components/layout/AppLink";
import PoolTableDiagram from "@/components/drills/PoolTableDiagram";
import PlayerPicker from "@/components/players/PlayerPicker";
import { DifficultyTag } from "@/components/ui/DifficultyTag";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { readKioskTable } from "@/libs/browser/kiosk";
import { useT } from "@/i18n";
import type { Player } from "@/types";
import { DrillCounter } from "@/components/drills/DrillCounter";
import { DrillResultDialog } from "@/components/drills/DrillResultDialog";

const route = getRouteApi("/app/_authed/$clubSlug/tables/$tableId_/drill");

/** A finished score left on the rail goes back to the table on its own. */
const RESULT_IDLE_MS = 30_000;

/**
 * The drill of the week, played at the table.
 *
 * The tablet already scores matches for whoever is standing at it; this is the
 * same thing for one player and a drill: who is shooting is picked in a dialog
 * before this opens, then tap each ball made, save. The board is the point — somebody walking past a free table sees
 * this week's leaders and a button to beat them.
 */
export default function TableDrillPage() {
  const { t } = useT();
  const { tableId } = route.useParams();
  const { player: shooterId } = route.useSearch();
  const navigate = route.useNavigate();
  const id = Number(tableId);
  const appNavigate = useAppNavigate();
  const { drill, since, isLoading } = useDrillOfWeek();
  const { data: players } = usePlayers();
  const { data: live } = useLiveMatches();
  const addLog = useAddDrillLog();

  const [score, setScore] = useState(0);
  const [saved, setSaved] = useState(false);
  // Arriving without a shooter (a reload, a typed URL) asks for one first.
  const [picking, setPicking] = useState(shooterId === undefined);
  const shooter = (players ?? []).find((p) => p.id === shooterId);

  useWakeLock();

  const back = () =>
    appNavigate("/app/$clubSlug/tables/$tableId", { tableId: String(id) });

  // A match landing on this table takes the tablet, same as on TablePage.
  const match = (live ?? []).find((m) => m.table_id === id);
  const pinned = readKioskTable() === id;
  useEffect(() => {
    if (pinned && match)
      appNavigate("/app/$clubSlug/live/$liveId", { liveId: match.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned, match?.id]);

  useEffect(() => {
    if (!saved || picking) return;
    const timer = setTimeout(back, RESULT_IDLE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, picking]);

  if (isLoading) return <PageSkeleton />;
  if (!drill)
    return (
      <div className="p-6 text-center text-body text-ink-faint">
        {t("drillWeek.empty")}
      </div>
    );

  const pick = (p: Player) => {
    setPicking(false);
    setScore(0);
    setSaved(false);
    void navigate({ search: { player: p.id }, replace: true });
  };

  const save = () =>
    shooter &&
    addLog.mutate(
      {
        drill_id: drill.id,
        player_id: shooter.id,
        score,
        max_score: drill.max_score,
      },
      {
        onSuccess: () => setSaved(true),
        onError: () => toast.error(t("drillWeek.saveError")),
      },
    );

  return (
    <div className="grid h-full min-h-0 gap-4 overflow-y-auto p-4 md:grid-cols-[3fr_2fr] md:overflow-hidden">
      {/* What the drill is, the table as big as the column allows, then how
          to set it up and how it counts. Scrolls on its own so the score never
          moves. */}
      <section className="flex min-h-0 flex-col gap-4 md:overflow-y-auto">
        <div>
          <p className="text-caption font-medium uppercase tracking-wide text-ink-faint">
            {t("drillWeek.title")}
          </p>
          <h1 className="text-h3 font-semibold text-ink">{drill.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-caption text-ink-faint">
            <DifficultyTag difficulty={drill.difficulty} />
            <span className="text-ink-ghost">·</span>
            <span>{t("drills.maxPoints", { n: drill.max_score })}</span>
          </div>
        </div>
        {/* shrink-0: in a scrolling flex column the svg is otherwise squeezed
            to whatever height is left, and draws the table smaller to fit. */}
        <PoolTableDiagram
          ballPositions={drill.ball_positions}
          shotPaths={drill.shot_paths}
          className="shrink-0"
        />
        <div className="space-y-3 text-body text-ink-soft">
          <div>
            <h2 className="text-caption font-medium uppercase tracking-wide text-ink-faint">
              {t("drills.setup")}
            </h2>
            <p>{drill.setup_instructions}</p>
          </div>
          <div>
            <h2 className="text-caption font-medium uppercase tracking-wide text-ink-faint">
              {t("drills.scoring")}
            </h2>
            <p>{drill.scoring_method}</p>
          </div>
        </div>
      </section>

      <section className="flex min-h-0 flex-col gap-4 md:overflow-y-auto">
        {shooter && (
          <DrillCounter
            shooter={shooter}
            score={score}
            max={drill.max_score}
            onChange={setScore}
            onSave={save}
            onCancel={back}
            saving={addLog.isPending || saved}
          />
        )}
      </section>

      {shooter && (
        <DrillResultDialog
          open={saved}
          drillId={drill.id}
          since={since}
          shooter={shooter}
          score={score}
          max={drill.max_score}
          onRetry={() => {
            setSaved(false);
            setScore(0);
          }}
          onDone={back}
        />
      )}

      <PlayerPicker
        open={picking}
        onPick={pick}
        // Closing with nobody picked leaves nothing to score.
        onClose={() => (shooter ? setPicking(false) : back())}
      />
    </div>
  );
}
