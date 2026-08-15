import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import PublicShell from "@/components/PublicShell";
import ClubThemeStyle from "@/components/ClubThemeStyle";
import GamesList from "@/components/GamesList";
import ShareButton from "@/components/ShareButton";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardHeader } from "@/components/ui/Card";
import { CategoryBadge } from "@/components/ui/Ball";
import { EmptyState } from "@/components/ui/EmptyState";
import { Stat } from "@/components/ui/Stat";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { gamesQuery } from "@/queries/games";
import { useT } from "@/i18n";

const route = getRouteApi("/_public/players/$playerId");

/** A player's whole record, not a page of it — the figures are cumulative. */
export const PUBLIC_PLAYER_GAMES_LIMIT = 1000;

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
      if (mine > theirs) won++;
    }

    const racks = racksWon + racksLost;
    return {
      played,
      won,
      racksWon,
      racks,
      winRate: played > 0 ? Math.round((won / played) * 100) : 0,
      rackRate: racks > 0 ? Math.round((racksWon / racks) * 100) : 0,
    };
  }, [gamesData.games, player.id]);

  const url = `${origin}/players/${player.id}`;

  return (
    <>
      {/* The player wears their club's accent: out here the club is the only
          context a stranger has for who this is. */}
      <ClubThemeStyle color={player.club?.theme_color} />

      <PublicShell>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar
            name={player.name}
            url={player.avatar_url}
            className="h-16 w-16 sm:h-20 sm:w-20"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-h1 font-semibold tracking-tight text-ink">
              {player.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {player.club && (
                <Link
                  to="/clubs/$slug"
                  params={{ slug: player.club.slug }}
                  className="flex items-center gap-1.5 text-body text-ink-soft transition-colors duration-150 hover:text-strike"
                >
                  <Avatar
                    name={player.club.name}
                    url={player.club.logo_url}
                    className="h-4 w-4"
                  />
                  {player.club.name}
                </Link>
              )}
              <CategoryBadge category={player.category} full />
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
        </header>

        {stats.played === 0 ? (
          <Card className="mt-6">
            <EmptyState
              title={t("players.noGamesTitle")}
              hint={t("players.noGamesHint", { name: player.name })}
            />
          </Card>
        ) : (
          <>
            <Card className="mt-6 grid grid-cols-2 gap-5 p-5">
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
            </Card>

            <Card className="mt-4 overflow-hidden">
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
      </PublicShell>
    </>
  );
}
