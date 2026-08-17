import { Avatar } from "@/components/ui/Avatar";
import { ballTone } from "@/components/ui/Ball";
import type { Places } from "@/libs/bracket";
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

export default function TournamentPodium({
  places,
  byId,
}: {
  places: Places;
  /** A name, a face and the slug the public profile is keyed on — no more, so
   *  the public tournament page can build it from a redacted roster. */
  byId: Map<number, Pick<Player, "name" | "avatar_url" | "slug">>;
}) {
  const { t } = useT();

  /**
   * A single-elimination draw never plays its two beaten semi-finalists off
   * against each other, so third is a list and there are usually two of them.
   * The extras go out on the far left rather than all onto the right end: four
   * steps in 2-1-3-3 order put the winner off-centre and the podium stopped
   * looking like one.
   */
  const [thirdRight, ...thirdLeft] = places.third;

  const third = (playerId: number) => ({ rank: 3, playerId });

  const steps: { rank: number; playerId: number }[] = [
    ...thirdLeft.map(third),
    ...(places.second !== null ? [{ rank: 2, playerId: places.second }] : []),
    ...(places.first !== null ? [{ rank: 1, playerId: places.first }] : []),
    ...(thirdRight !== undefined ? [third(thirdRight)] : []),
  ];

  if (steps.length === 0) return null;

  return (
    /* No padding under the steps: they are plinths, and a plinth stands on the
       floor. Every container this goes in clips its own corners. */
    <div className="flex items-end justify-center gap-2 px-3 pt-6 sm:gap-4">
      {steps.map(({ rank, playerId }) => {
        const player = byId.get(playerId);
        return (
          <div
            key={playerId}
            className="flex min-w-0 flex-1 basis-0 flex-col items-center gap-2 sm:max-w-40"
          >
            <Avatar
              name={player?.name ?? "—"}
              url={player?.avatar_url ?? undefined}
              className={rank === 1 ? "h-16 w-16" : "h-12 w-12"}
            />
            <PlayerLink
              playerId={playerId}
              playerSlug={player?.slug}
              className="line-clamp-2 text-center text-caption font-medium text-ink transition-colors duration-150 hover:text-strike"
            >
              {player?.name ?? "—"}
            </PlayerLink>
            {/* The block itself is the ranking: taller is better, and the
                object-ball colour repeats it for anyone who cannot compare two
                heights at a glance — 1 yellow, 2 blue, 3 red, the same three the
                league table's rank column wears. */}
            <div
              className={[
                "flex w-full items-center justify-center rounded-t-control font-mono font-semibold tabular-nums",
                rank === 1 ? "text-h2" : "text-h3",
                HEIGHT[rank],
                ballTone(rank).bg,
                ballTone(rank).fg,
              ].join(" ")}
            >
              {rank}
            </div>
            <span className="sr-only">
              {t("tournaments.place", { n: rank })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
