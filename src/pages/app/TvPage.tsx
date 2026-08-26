import { LuExpand } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useGetGames } from "@/hooks/useGetGames";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useDailyRanking } from "@/hooks/useDailyRanking";
import { useLiveMatches } from "@/hooks/useLiveMatch";
import Scoreboard from "@/components/live/Scoreboard";
import Ranking from "@/components/ranking/Ranking";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/Button";
import { useFullscreen } from "@/libs/useFullscreen";
import { useWakeLock } from "@/libs/useWakeLock";
import { dayKeyOf, zoneOf } from "@/libs/day";
import { useNow } from "@/libs/useNow";
import { useT } from "@/i18n";

const gridFor = (n: number) =>
  n <= 1
    ? "grid-cols-1"
    : n === 2
      ? "grid-rows-2"
      : n <= 4
        ? "grid-cols-2 grid-rows-2"
        : "grid-cols-[repeat(auto-fit,minmax(28rem,1fr))]";

export default function TvPage() {
  const { t, locale } = useT();
  const { activeClub } = useAuth();
  const tz = zoneOf(activeClub);
  const { ref, isFullscreen, toggle } = useFullscreen<HTMLDivElement>();

  // A minute is the resolution of a clock on a wall, and it is what rolls the
  // date over. Null until the browser has it — see libs/useNow.
  const now = useNow(60_000);
  // Rolls over at 06:00, not at midnight: the wall display must not blank the
  // night's standings while the last two are still playing — see libs/day.ts.
  const today = now === null ? null : dayKeyOf(now, tz);

  const { data: live } = useLiveMatches({ poll: true });
  const { data: players } = useGetPlayers();
  const { data: gamesData, isLoading: gamesLoading } = useGetGames(
    { date: today ?? undefined, mode: "single", tz },
    { poll: true },
  );
  const ranking = useDailyRanking({
    games: gamesData?.games ?? [],
    players,
  });

  useWakeLock();

  const matches = live ?? [];
  const roster = players ?? [];
  const playerOf = (id: number | null) =>
    id === null ? undefined : roster.find((p) => p.id === id);

  const ladder = (
    <Ranking
      ranking={ranking}
      viewMode="combined"
      isLoading={gamesLoading}
      emptyMessage={t("ranking.emptyDaily")}
    />
  );

  return (
    <div ref={ref} className="flex h-full flex-col bg-pocket">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-hairline px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {activeClub && (
            <Avatar
              name={activeClub.name}
              url={activeClub.logo_url}
              mark
              shape="plate"
              className="h-9 w-9 shrink-0"
            />
          )}
          <h1 className="truncate text-h3 font-semibold text-ink">
            {activeClub?.name}
          </h1>
          {matches.length > 0 && (
            <span className="live-dot h-2 w-2 shrink-0 rounded-full bg-strike" />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="font-mono text-h3 tabular-nums text-ink-soft">
            {now === null
              ? "--:--"
              // The club's language, not the device's: a tablet bought in
              // one country and hung on a wall in another was showing a
              // Spanish room a 12-hour clock.
              : new Date(now).toLocaleTimeString(locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
          </span>
          <IconButton
            label={isFullscreen ? t("common.close") : t("ranking.tvMode")}
            onClick={toggle}
          >
            <LuExpand className="h-5 w-5" aria-hidden />
          </IconButton>
        </div>
      </header>

      {matches.length === 0 ? (
        // The wall falls back to the ladder rather than to an empty state: a
        // quiet Tuesday still has a standing to look at.
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{ladder}</div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
          <div
            className={`grid min-h-0 flex-1 gap-3 ${gridFor(matches.length)}`}
          >
            {matches.map((match) => (
              <div
                key={match.id}
                className="min-h-0 overflow-hidden rounded-card border border-hairline bg-felt"
              >
                <Scoreboard
                  match={match}
                  p1={playerOf(match.player_1_id)}
                  p1b={playerOf(match.player_1b_id)}
                  p2={playerOf(match.player_2_id)}
                  p2b={playerOf(match.player_2b_id)}
                  variant="tv"
                />
              </div>
            ))}
          </div>

          {/* The one thing beside the tables: today's ladder. It stays put —
              nothing rotates through here, so a glance up finds the same list
              in the same place, which is what a wall display is for. */}
          <aside className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-card border border-hairline bg-felt lg:w-[28rem] xl:w-[34rem]">
            <h2 className="shrink-0 border-b border-hairline px-4 py-3 text-caption font-medium uppercase tracking-wide text-ink-faint">
              {t("ranking.dailyTitle")}
            </h2>
            <div className="min-h-0 flex-1 overflow-y-auto">{ladder}</div>
          </aside>
        </div>
      )}
    </div>
  );
}
