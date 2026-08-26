import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LuMinus, LuPlus } from "react-icons/lu";
import { Avatar } from "@/components/ui/Avatar";
import { DisciplineBall } from "@/components/ui/Ball";
import { Button } from "@/components/ui/Button";
import { keys } from "@/libs/queryKeys";
import { isMatchOver, leaderOf } from "@/libs/night";
import { useWakeLock } from "@/libs/useWakeLock";
import type { LiveMatch, Player } from "@/types";
import { useT } from "@/i18n";

export type ScoreboardVariant = "play" | "spectate" | "tv";

/** Past this a bead stops being countable at a glance and the ratio says it
 *  better — the same reason a real wire carries a dozen beads and not fifty. */
const BEAD_LIMIT = 12;

/**
 * The score, at arm's length, with a cue in the other hand.
 *
 * One table, not two cards: the two halves share a surface and are divided by a
 * spine, because this is a contest and two floating panels are two widgets. The
 * numerals are the only ivory mass on the screen and they are what wins.
 *
 * Nothing recolours to say who is ahead. Two numbers in two colours stop being
 * comparable, and index.css is explicit that a fill acts while a rail only
 * points — so leading is a 2px rail over that half plus the lamp catching it,
 * the way the pendant catches the end of the table that is being played.
 *
 * One component for all three ways it is looked at. A spectator sees the same
 * object with the controls taken out.
 */
export default function Scoreboard({
  match,
  p1,
  p1b,
  p2,
  p2b,
  variant,
  onBump,
  onUnbump,
  onFinish,
  isFinishing,
}: {
  match: LiveMatch;
  p1?: Player;
  /** The partners, in doubles. Both or neither, the same as the row. */
  p1b?: Player;
  p2?: Player;
  p2b?: Player;
  variant: ScoreboardVariant;
  onBump?: (side: 1 | 2) => void;
  onUnbump?: (side: 1 | 2) => void;
  onFinish?: () => void;
  isFinishing?: boolean;
}) {
  const { t } = useT();
  const queryClient = useQueryClient();
  const canScore = variant === "play";

  // The wall display holds one for the whole screen; a lock per match on it
  // would be four sentinels doing one job.
  useWakeLock(variant !== "tv");

  // Realtime drops frames while a tab is hidden, and react-query's default
  // staleness would then render the score from before the phone went in a
  // pocket. This screen is the one place where being confidently wrong shows.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      queryClient.invalidateQueries({ queryKey: keys.liveMatch.all });
      queryClient.invalidateQueries({ queryKey: keys.liveMatches.all });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [queryClient]);

  const over = isMatchOver(match);
  const leader = leaderOf(match);
  const winner = leader === 1 ? p1 : leader === 2 ? p2 : undefined;

  /**
   * The bead wire. A pool room keeps score on a string of beads slid along a
   * wire over the table, and that is what this is: the wire is a hairline
   * through the middle, the beads sit on it, and the racks won are pushed to
   * the player's own end the way a hand pushes them.
   */
  const wire = (side: 1 | 2, score: number) => {
    if (match.race_to > BEAD_LIMIT)
      return (
        <span className="text-caption tabular-nums text-ink-faint">
          {score} / {match.race_to}
        </span>
      );

    return (
      <div className="relative flex items-center justify-center" aria-hidden>
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-hairline" />
        <div
          className={[
            "relative flex items-center gap-[max(2px,1cqmin)]",
            // Won beads gather at the player's own end, so a glance at which
            // way the string is bunched is the score.
            side === 1 ? "flex-row" : "flex-row-reverse",
          ].join(" ")}
        >
          {Array.from({ length: match.race_to }, (_, i) => (
            <span
              key={i}
              className={[
                "h-[var(--scoreboard-bead)] w-[var(--scoreboard-bead)] rounded-full border transition-colors duration-200 ease-[var(--ease-out)]",
                i < score
                  ? "border-transparent bg-ink"
                  : "border-hairline bg-pocket",
              ].join(" ")}
            />
          ))}
        </div>
      </div>
    );
  };

  const half = (n: 1 | 2) => {
    // One player or a pair. The pair is the unit that wins the rack, so it is
    // the unit the half is labelled with.
    const side = (n === 1 ? [p1, p1b] : [p2, p2b]).filter(
      (p): p is Player => p !== undefined,
    );
    const score = n === 1 ? match.player_1_score : match.player_2_score;
    const full = side.map((p) => p.name).join(" & ") || "—";
    // ponytail: first names in doubles. Two full Spanish names across half a
    // phone are unreadable at any size that fits, and "Juan & Paula" is what
    // the room says anyway. The faces disambiguate, and the full names stay on
    // the element for anything reading it aloud.
    const name =
      side.length > 1 ? side.map((p) => p.name.split(" ")[0]).join(" & ") : full;
    const ahead = leader === n;

    return (
      <section
        aria-label={full}
        data-side={n}
        className={[
          "scoreboard-half relative flex flex-col items-center justify-center gap-[var(--scoreboard-gap)] p-[var(--scoreboard-gap)]",
          // The pendant catching this end of the table.
          // --lamp-strong, and the fade pulled in to 65%: at four metres the
          // 6% wash was a difference you had to be told about. The rail says
          // it too — this is the same statement said loudly enough to carry.
          ahead
            ? "bg-[radial-gradient(120%_80%_at_50%_100%,var(--lamp-strong),transparent_65%)]"
            : "",
        ].join(" ")}
      >
        {/* Points, does not act: 2px, inset from the corners so it reads as a
            rail under the half rather than a border on it. Along the bottom
            edge, where the cushion is — and where a hand reaching for the
            controls is not covering it. */}
        <span
          className={[
            "absolute inset-x-8 bottom-0 h-1 rounded-full transition-opacity duration-200 ease-[var(--ease-out)]",
            ahead ? "bg-strike opacity-100" : "opacity-0",
          ].join(" ")}
          aria-hidden
        />

        {/* The score and its wire are one thing, so they sit tight together and
            the air goes below them. */}
        <div className="scoreboard-stack gap-[var(--scoreboard-gap)]">
          <div className="flex w-full flex-col items-center gap-[max(0.25rem,2cqmin)]">
            <span
              className="font-mono font-semibold leading-none tracking-tight text-ink tabular-nums"
              style={{ fontSize: "var(--text-score)" }}
            >
              {score}
            </span>
            {wire(n, score)}
          </div>

          {/* Whose half this is. On one line, so it reads as a label on the
              score above rather than a third stacked element — and a pair
              overlaps its faces rather than taking a second line, which the
              height there is does not have. */}
          <div
            className="flex min-w-0 max-w-full items-center gap-[max(0.5rem,2cqmin)]"
            title={full}
          >
            <div className="flex shrink-0 -space-x-2">
              {side.map((p) => (
                // No seed, so a face without a picture is a grey disc rather
                // than a solid ball colour. The palette is for a roster grid;
                // here one of the eight hues is the club's own accent, which is
                // the + button — and the initial next to the score has no
                // business being the loudest thing on the half.
                <Avatar
                  key={p.id}
                  name={p.name}
                  url={p.avatar_url}
                  className="h-[var(--scoreboard-face)] w-[var(--scoreboard-face)] shrink-0 ring-2 ring-felt"
                />
              ))}
            </div>
            <span
              className="min-w-0 truncate font-semibold leading-tight text-ink"
              style={{ fontSize: "var(--text-scoreboard-name)" }}
            >
              {name}
            </span>
          </div>
        </div>

        {canScore && (
          // The only fill on this half, and the only thing here that acts.
          // Under the score on a tall screen, beside it on a wide one — see
          // .scoreboard-controls in index.css.
          <div className="scoreboard-controls">
            <Button
              variant="secondary"
              aria-label={t("live.unscoreFor", { name: full })}
              onClick={() => onUnbump?.(n)}
              disabled={score === 0}
              className="scoreboard-btn"
            >
              <LuMinus aria-hidden />
            </Button>
            <Button
              aria-label={t("live.scoreFor", { name: full })}
              // The finish sheet is up: a press landing behind it must do
              // nothing, and libs/night.ts refuses the write too.
              disabled={over}
              onClick={() => onBump?.(n)}
              className="scoreboard-btn"
            >
              <LuPlus aria-hidden />
            </Button>
          </div>
        )}
      </section>
    );
  };

  return (
    // Edge to edge. This is the whole screen on a tablet propped on the rail,
    // so a card floating in a margin would be giving away the two things that
    // matter at four metres: size, and half the room each.
    <div
      className="scoreboard relative"
      // The wall never stacks: a tile up there is read from the far end of the
      // room, and one half above the other halves the size of both numbers.
      data-layout={variant === "tv" ? "wide" : undefined}
    >
      <div className="scoreboard-grid">
        {half(1)}

        {/* The spine. What is on the table and to how many — the label on the
            match, deliberately the quietest column on it. Its own hairlines are
            the only division the two halves need. */}
        <div className="scoreboard-spine flex shrink-0 flex-col items-center justify-center gap-[max(0.5rem,2cqmin)] bg-pocket/40 p-2">
          <DisciplineBall
            discipline={match.discipline}
            className="h-[var(--scoreboard-face)] w-[var(--scoreboard-face)] shrink-0"
          />
          <span
            className="text-center font-medium uppercase leading-tight tracking-wide text-ink-faint"
            style={{ fontSize: "var(--text-scoreboard-label)" }}
          >
            {t("live.raceTo", { n: match.race_to })}
          </span>
          {variant === "spectate" && (
            <span className="flex items-center gap-1.5 text-caption text-ink-faint">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-strike" />
              {t("live.watching")}
            </span>
          )}
        </div>

        {half(2)}
      </div>

      {/* The outcome of the screen, over the screen — not a dialog interrupting
          it. Reaching the race does not file anything: someone has to say so. */}
      {canScore && over && (
        <div className="absolute inset-x-0 bottom-0 z-10 space-y-4 rounded-t-sheet border-t border-hairline bg-felt-raised p-5">
          <div>
            <p className="text-caption font-medium uppercase tracking-wide text-ink-faint">
              {t("live.raceTo", { n: match.race_to })}
            </p>
            <p className="mt-1 text-h2 font-semibold text-ink">
              {t("live.wins", { name: winner?.name ?? "—" })}
            </p>
            <p className="font-mono text-h4 text-ink-soft tabular-nums">
              {match.player_1_score} – {match.player_2_score}
            </p>
          </div>
          <div className="flex justify-end gap-3">
            {/* The recovery path for the one mis-press that cannot be walked
                back any other way: the one that reached the race. Takes the
                rack off whoever got there, so it does not depend on the row
                remembering which button was last pressed. */}
            <Button
              variant="secondary"
              onClick={() => leader && onUnbump?.(leader)}
              disabled={isFinishing}
            >
              {t("live.keepPlaying")}
            </Button>
            <Button onClick={onFinish} disabled={isFinishing}>
              {isFinishing ? t("common.saving") : t("live.file")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
