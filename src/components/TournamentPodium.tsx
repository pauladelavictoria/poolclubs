import { Avatar } from "@/components/ui/Avatar";
import type { Places } from "@/libs/bracket";
import type { Player } from "@/types";
import { useT } from "@/i18n";
import PlayerLink from "@/components/PlayerLink";

/** Second on the left, winner in the middle, third on the right: the shape of a
 *  real podium, read middle-first rather than left-to-right. */
const HEIGHT: Record<number, string> = { 1: "h-16", 2: "h-11", 3: "h-8" };

export default function TournamentPodium({
  places,
  byId,
}: {
  places: Places;
  /** Only a name and a face are read, so the map asks for only those: the public
   *  tournament page builds it from a redacted roster. */
  byId: Map<number, Pick<Player, "name" | "avatar_url">>;
}) {
  const { t } = useT();

  const steps: { rank: number; playerId: number }[] = [
    ...(places.second !== null ? [{ rank: 2, playerId: places.second }] : []),
    ...(places.first !== null ? [{ rank: 1, playerId: places.first }] : []),
    ...places.third.map((playerId) => ({ rank: 3, playerId })),
  ];

  if (steps.length === 0) return null;

  return (
    <div className="flex items-end justify-center gap-2 px-3 py-6 sm:gap-4">
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
              className="line-clamp-2 text-center text-caption font-medium text-ink transition-colors duration-150 hover:text-strike"
            >
              {player?.name ?? "—"}
            </PlayerLink>
            {/* The block itself is the ranking: taller is better, and the ball
                repeats it for anyone who cannot compare two heights at a
                glance. */}
            <div
              className={[
                "flex w-full items-center justify-center rounded-t-control border border-b-0 border-hairline bg-felt-raised",
                HEIGHT[rank],
              ].join(" ")}
            >
              <span
                className={[
                  "font-mono font-semibold tabular-nums",
                  rank === 1 ? "text-h2 text-strike" : "text-h3 text-ink-soft",
                ].join(" ")}
              >
                {rank}
              </span>
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
