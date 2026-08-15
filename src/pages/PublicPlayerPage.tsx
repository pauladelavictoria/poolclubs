import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import PublicShell from "@/components/PublicShell";
import GamesList from "@/components/GamesList";
import ShareButton from "@/components/ShareButton";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardHeader } from "@/components/ui/Card";
import { CategoryBadge } from "@/components/ui/Ball";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHead } from "@/components/ui/SectionHead";
import { Stat } from "@/components/ui/Stat";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { gamesQuery } from "@/queries/games";
import type { PublicPlayerWithClub } from "@/queries/public";
import { useT } from "@/i18n";

const route = getRouteApi("/_public/players/$playerId");

/** A player's whole record, not a page of it — the figures are cumulative. */
export const PUBLIC_PLAYER_GAMES_LIMIT = 1000;

type Opponent = { id: number; name: string; wins: number; losses: number };

/**
 * A player's public profile: who they play for, how often they win, and what they
 * have played lately.
 *
 * The club's own player page has a win-rate chart, a challenge button and a
 * training plan. None of those belongs here — two are actions only a member can
 * take, and the third is somebody's practice diary.
 */
export default function PublicPlayerPage() {
  const { t } = useT();
  const { player, origin } = route.useLoaderData();

  const { data: gamesData } = useSuspenseQuery(
    gamesQuery(player.club_id, {
      playerId: player.id,
      pageSize: PUBLIC_PLAYER_GAMES_LIMIT,
    }),
  );

  const stats = useMemo(() => {
    let played = 0;
    let won = 0;
    let racksWon = 0;
    let racksLost = 0;
    // Games arrive newest-first, so the first ten seen are the last ten played.
    const last10: boolean[] = [];
    const opponents = new Map<number, Opponent>();

    const addOpponent = (
      id: number | null,
      name: string | null,
      won: boolean,
    ) => {
      if (id === null || name === null) return;
      const entry = opponents.get(id) ?? { id, name, wins: 0, losses: 0 };
      if (won) entry.wins++;
      else entry.losses++;
      opponents.set(id, entry);
    };

    for (const game of gamesData.games) {
      // By id, matching the filter that fetched these rows: the names on a game
      // are a copy from when it was written, so a renamed player matches neither
      // side.
      const inTeam1 =
        game.player_1_id === player.id || game.player_1b_id === player.id;
      const inTeam2 =
        game.player_2_id === player.id || game.player_2b_id === player.id;
      if (!inTeam1 && !inTeam2) continue;

      played++;
      const mine = inTeam1 ? game.player_1_score : game.player_2_score;
      const theirs = inTeam1 ? game.player_2_score : game.player_1_score;
      racksWon += mine;
      racksLost += theirs;
      const playerWon = mine > theirs;
      if (playerWon) won++;
      if (last10.length < 10) last10.push(playerWon);

      if (inTeam1) {
        addOpponent(game.player_2_id, game.player_2_name, playerWon);
        addOpponent(game.player_2b_id, game.player_2b_name, playerWon);
      } else {
        addOpponent(game.player_1_id, game.player_1_name, playerWon);
        addOpponent(game.player_1b_id, game.player_1b_name, playerWon);
      }
    }

    const racks = racksWon + racksLost;
    const topOpponents = Array.from(opponents.values())
      .sort((a, b) => b.wins + b.losses - (a.wins + a.losses))
      .slice(0, 3);

    return {
      played,
      won,
      racksWon,
      racks,
      winRate: played > 0 ? Math.round((won / played) * 100) : 0,
      rackRate: racks > 0 ? Math.round((racksWon / racks) * 100) : 0,
      last10,
      topOpponents,
    };
  }, [gamesData.games, player.id]);

  const url = `${origin}/players/${player.id}`;

  return (
    <>
      <PlayerHero player={player} stats={stats} url={url} />

      <PublicShell>
        {stats.played === 0 ? (
          <Card className="mt-6">
            <EmptyState
              title={t("players.noGamesTitle")}
              hint={t("players.noGamesHint", { name: player.name })}
            />
          </Card>
        ) : (
          <>
            {stats.topOpponents.length > 0 && (
              <section className="mt-6">
                <SectionHead title={t("public.publicPlayer.opponents")} />
                <div className="mt-5 grid grid-cols-3 gap-4">
                  {stats.topOpponents.map((opponent) => (
                    <Link
                      key={opponent.id}
                      to="/players/$playerId"
                      params={{ playerId: String(opponent.id) }}
                      className="group flex flex-col items-center gap-2 text-center"
                    >
                      <Avatar
                        name={opponent.name}
                        seed={opponent.id}
                        className="h-14 w-14"
                      />
                      <span className="w-full truncate text-body font-medium text-ink transition-colors duration-150 group-hover:text-strike">
                        {opponent.name}
                      </span>
                      <span className="font-mono text-caption tabular-nums text-ink-faint">
                        {opponent.wins}–{opponent.losses}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <Card className="mt-10 overflow-hidden">
              <CardHeader title={t("games.history")} />
              <div className="p-3">
                <GamesList
                  games={gamesData.games}
                  playerId={player.id}
                  showDates
                  public
                />
              </div>
            </Card>
          </>
        )}

        {player.club && (
          <Link
            to="/clubs/$slug"
            params={{ slug: player.club.slug }}
            data-ball={player.club.theme_color}
            className="wash wash-soft lift mt-10 flex flex-col items-center gap-4 rounded-sheet border border-hairline p-8 text-center sm:flex-row sm:justify-between sm:text-left"
          >
            <div className="flex items-center gap-3">
              <Avatar
                name={player.club.name}
                url={player.club.logo_url}
                mark
                shape="plate"
                className="h-14 w-14"
              />
              <div>
                <p className="text-caption text-ink-faint">
                  {t("public.publicPlayer.playsFor")}
                </p>
                <p className="text-h3 font-semibold text-ink">
                  {player.club.name}
                </p>
              </div>
            </div>
            <span
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              {t("public.publicPlayer.viewClub")}
            </span>
          </Link>
        )}
      </PublicShell>
    </>
  );
}

/**
 * Full-bleed, no photography (a stock pool-hall photo behind a named real
 * person implies it is their room). Colour comes from the club's own wash,
 * type from the category badge, and the two headline numbers plus a last-10
 * form strip are pulled up here rather than left in a card below the fold.
 */
function PlayerHero({
  player,
  stats,
  url,
}: {
  player: PublicPlayerWithClub;
  stats: {
    played: number;
    won: number;
    racksWon: number;
    racks: number;
    winRate: number;
    rackRate: number;
    last10: boolean[];
  };
  url: string;
}) {
  const { t } = useT();

  return (
    <section
      data-ball={player.club?.theme_color}
      className="wash wash-soft relative overflow-hidden border-b border-hairline"
    >
      <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6 sm:pt-16 sm:pb-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-6">
            <Avatar
              name={player.name}
              url={player.avatar_url}
              seed={player.id}
              className="h-20 w-20 sm:h-28 sm:w-28"
            />
            <div className="min-w-0">
              <h1 className="truncate text-display leading-[1.05] font-semibold tracking-tighter text-ink">
                {player.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {player.club && (
                  <Link
                    to="/clubs/$slug"
                    params={{ slug: player.club.slug }}
                    className="flex items-center gap-1.5 text-body text-ink-soft transition-colors duration-150 hover:text-strike"
                  >
                    <Avatar
                      name={player.club.name}
                      url={player.club.logo_url}
                      mark
                      className="h-4 w-4"
                    />
                    {player.club.name}
                  </Link>
                )}
                <CategoryBadge category={player.category} full />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ShareButton title={player.name} url={url} />
            <Link
              to="/app"
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              {t("public.cta.signIn")}
            </Link>
          </div>
        </div>

        {stats.played > 0 && (
          <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex gap-8">
              <Stat
                label={t("players.gamesWon")}
                value={`${stats.winRate}%`}
                delta={t("players.ofTotal", {
                  n: stats.won,
                  total: stats.played,
                })}
                tone="good"
              />
              <Stat
                label={t("players.racksWon")}
                value={`${stats.rackRate}%`}
                delta={t("players.ofTotal", {
                  n: stats.racksWon,
                  total: stats.racks,
                })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-caption text-ink-faint">
                {t("public.publicPlayer.form")}
              </span>
              <div
                className="flex gap-1"
                aria-label={t("public.publicPlayer.form")}
              >
                {stats.last10.map((won, i) => (
                  <span
                    key={i}
                    aria-hidden
                    className={`h-2.5 w-2.5 rounded-full ${won ? "bg-pot" : "bg-ink-ghost"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
