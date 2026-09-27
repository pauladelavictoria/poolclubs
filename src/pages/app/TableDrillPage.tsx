import { useEffect, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { LuMinus, LuPlus } from "react-icons/lu";
import { usePlayers } from "@/hooks/usePlayers";
import { useLiveMatches } from "@/hooks/useLiveMatch";
import { useAddDrillLog } from "@/hooks/useAddDrillLog";
import { useDrillBoard, useDrillOfWeek } from "@/hooks/useDrillOfWeek";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useDialog } from "@/hooks/useDialog";
import { dialogClasses } from "@/components/ui/cardStyles";
import { useAppNavigate } from "@/components/layout/AppLink";
import PoolTableDiagram from "@/components/drills/PoolTableDiagram";
import DrillWeekBoard from "@/components/drills/DrillWeekBoard";
import PlayerPicker from "@/components/players/PlayerPicker";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { DifficultyTag } from "@/components/ui/DifficultyTag";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { readKioskTable } from "@/libs/browser/kiosk";
import { useT } from "@/i18n";
import type { Player } from "@/types";

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
          <Counter
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
        <Result
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

function Counter({
  shooter,
  score,
  max,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  shooter: Player;
  score: number;
  max: number;
  onChange: (n: number) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const { t } = useT();
  const pct = max > 0 ? (score / max) * 100 : 0;
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar
          name={shooter.name}
          url={shooter.avatar_url}
          seed={shooter.id}
          className="h-10 w-10"
        />
        <span className="truncate text-h3 font-semibold text-ink">
          {shooter.name}
        </span>
      </div>
      <p
        className="text-center font-mono leading-none font-semibold tabular-nums text-ink"
        style={{ fontSize: "clamp(4rem, 18vmin, 10rem)" }}
      >
        {score}
        <span className="text-[0.35em] text-ink-faint">/{max}</span>
      </p>
      {/* The wire the beads slide along, as a bar: max_score runs to 100. */}
      <div className="h-2 overflow-hidden rounded-full bg-hairline">
        <div
          className="h-full bg-strike transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Same two columns as the row under it, so − sits over Cancel and +
          over Save. */}
      <div className="grid flex-1 grid-cols-2 gap-3">
        <button
          type="button"
          aria-label={t("drillWeek.undo")}
          disabled={score === 0}
          onClick={() => onChange(Math.max(0, score - 1))}
          className="flex min-h-24 items-center justify-center rounded-card border border-hairline bg-felt text-ink disabled:opacity-40"
        >
          <LuMinus className="h-10 w-10" aria-hidden />
        </button>
        <button
          type="button"
          aria-label={t("drillWeek.made")}
          disabled={score >= max}
          onClick={() => onChange(Math.min(max, score + 1))}
          className="flex min-h-24 items-center justify-center rounded-card bg-strike text-white disabled:opacity-40"
        >
          <LuPlus className="h-10 w-10" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          {t("common.cancel")}
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {t("drillWeek.save")}
        </Button>
      </div>
    </div>
  );
}

/**
 * The saved score, where it lands on the club's board, and the two ways on:
 * the same player again, or back to the table. Dismissing it is trying again
 * — the scoreboard behind is where Esc or a tap outside leaves you.
 */
function Result({
  open,
  drillId,
  since,
  shooter,
  score,
  max,
  onRetry,
  onDone,
}: {
  open: boolean;
  drillId: number;
  since: string;
  shooter: Player;
  score: number;
  max: number;
  onRetry: () => void;
  onDone: () => void;
}) {
  const { t } = useT();
  const ref = useDialog(open);
  const { data: rows } = useDrillBoard(drillId, since);
  const rank = (rows?.findIndex((r) => r.player_id === shooter.id) ?? -1) + 1;

  return (
    <dialog
      ref={ref}
      className={dialogClasses({ wide: true })}
      aria-label={shooter.name}
      onClose={() => open && onRetry()}
      onClick={(e) => {
        if (e.target === ref.current) onRetry();
      }}
    >
      <div className="space-y-4 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-h3 font-semibold text-ink">
              {shooter.name}
            </p>
            {rank > 0 && (
              <p className="text-h4 text-ink-soft">
                {t("drillWeek.rankClub", { n: rank })}
              </p>
            )}
          </div>
          <p className="shrink-0 font-mono text-h2 font-semibold tabular-nums text-ink">
            {score}
            <span className="text-ink-faint">/{max}</span>
          </p>
        </div>
        <div className="max-h-[50dvh] overflow-y-auto outline-none">
          <DrillWeekBoard
            drillId={drillId}
            since={since}
            highlight={shooter.id}
            tablet
            scrollToHighlight
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="h-14 flex-1 text-h4"
            onClick={onDone}
          >
            {t("drillWeek.done")}
          </Button>
          <Button className="h-14 flex-1 text-h4" onClick={onRetry}>
            {t("drillWeek.tryAgain")}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
