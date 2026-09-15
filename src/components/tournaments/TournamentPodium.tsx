import { Avatar } from "@/components/ui/Avatar";
import { ballTone } from "@/components/ui/Ball";
import type { Places } from "@/libs/algorithms/bracket";
import type { Player } from "@/types";
import { useT } from "@/i18n";
import PlayerLink from "@/components/players/PlayerLink";

/** Second on the left, winner in the middle, third on the right: the shape of a
 *  real podium, read middle-first rather than left-to-right.
 *
 *  The step itself is the ball's colour, so the number needs no badge inside it:
 *  a yellow, a blue and a red plinth read as first, second and third from across
 *  a room, which a 28px circle sitting on grey never did. */
const HEIGHT: Record<number, string> = { 1: "h-20", 2: "h-14", 3: "h-10" };

/** The same three steps at a size a directory tile can hold, where the faces
 *  are the whole content — see `compact`. */
const COMPACT_HEIGHT: Record<number, string> = { 1: "h-9", 2: "h-6", 3: "h-4" };

export default function TournamentPodium({
  places,
  byId,
  compact = false,
}: {
  places: Places;
  /** A name, a face and the slug the public profile is keyed on — no more, so
   *  the public tournament page can build it from a redacted roster. */
  byId: Map<number, Pick<Player, "name" | "avatar_url" | "slug">>;
  /** Faces only, at tile size. Names are dropped rather than shrunk — three
   *  truncated ones say less than three photographs — and with them go the
   *  profile links, which cannot be nested inside the card that is itself a
   *  link. The names stay in the accessible name of each step. */
  compact?: boolean;
}) {
  const { t } = useT();

  /**
   * A single-elimination draw never plays its two beaten semi-finalists off
   * against each other, so third is shared rather than decided — one step,
   * both faces on it, same as a real bronze tie.
   */
  const steps: { rank: number; playerIds: number[] }[] = [
    ...(places.second !== null
      ? [{ rank: 2, playerIds: [places.second] }]
      : []),
    ...(places.first !== null ? [{ rank: 1, playerIds: [places.first] }] : []),
    ...(places.third.length > 0
      ? [{ rank: 3, playerIds: places.third }]
      : []),
  ];

  if (steps.length === 0) return null;

  return (
    /* No padding under the steps: they are plinths, and a plinth stands on the
       floor. Every container this goes in clips its own corners. */
    <div
      className={
        compact
          ? "flex items-end justify-center gap-1.5"
          : "flex items-end justify-center gap-2 px-3 pt-6 sm:gap-4"
      }
    >
      {steps.map(({ rank, playerIds }) => {
        const players = playerIds.map((id) => byId.get(id));
        const avatarSize = compact
          ? rank === 1
            ? "h-10 w-10"
            : "h-8 w-8"
          : rank === 1
            ? "h-16 w-16"
            : "h-12 w-12";
        return (
          <div
            key={playerIds.join("-")}
            className={
              compact
                ? "flex min-w-0 flex-1 basis-0 flex-col items-center gap-1.5 sm:max-w-16"
                : "flex min-w-0 flex-1 basis-0 flex-col items-center gap-2 sm:max-w-40"
            }
          >
            {/* Two faces share one step exactly as two names share one row
                below: overlapping rather than side by side, so a shared bronze
                still reads as one place rather than two half-width ones. */}
            <div className="flex -space-x-3">
              {playerIds.map((id) => (
                <Avatar
                  key={id}
                  name={byId.get(id)?.name ?? "—"}
                  url={byId.get(id)?.avatar_url ?? undefined}
                  className={[
                    avatarSize,
                    playerIds.length > 1 ? "ring-2 ring-felt" : "",
                  ].join(" ")}
                />
              ))}
            </div>
            {!compact && (
              <span className="line-clamp-2 text-center text-caption font-medium text-ink">
                {playerIds.map((id, i) => (
                  <span key={id}>
                    {i > 0 && " / "}
                    <PlayerLink
                      playerId={id}
                      playerSlug={byId.get(id)?.slug}
                      className="transition-colors duration-150 hover:text-strike"
                    >
                      {byId.get(id)?.name ?? "—"}
                    </PlayerLink>
                  </span>
                ))}
              </span>
            )}
            {/* The block itself is the ranking: taller is better, and the
                object-ball colour repeats it for anyone who cannot compare two
                heights at a glance — 1 yellow, 2 blue, 3 red, the same three the
                league table's rank column wears. */}
            <div
              className={[
                "flex w-full items-center justify-center rounded-t-control font-mono font-semibold tabular-nums",
                compact ? "text-caption" : rank === 1 ? "text-h2" : "text-h3",
                (compact ? COMPACT_HEIGHT : HEIGHT)[rank],
                ballTone(rank).bg,
                ballTone(rank).fg,
              ].join(" ")}
            >
              {rank}
            </div>
            <span className="sr-only">
              {t("tournaments.place", { n: rank })}
              {compact && players.length
                ? ` — ${players.map((p) => p?.name ?? "—").join(" / ")}`
                : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
