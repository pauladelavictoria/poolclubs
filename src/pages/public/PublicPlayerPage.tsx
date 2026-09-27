import { useMemo } from "react";
import { useSuspenseQueries } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import PublicShell from "@/components/layout/PublicShell";
import GamesList from "@/components/games/GamesList";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHead } from "@/components/ui/SectionHead";
import { gamesQuery } from "@/queries/games";
import {
  publicClubRosterQuery,
  type PublicPlayer,
} from "@/queries/public/clubs";
import { useT } from "@/i18n";
import { PlayerHero } from "@/components/public/PlayerHero";

const route = getRouteApi("/_public/players/$playerSlug");

/** A player's whole record, not a page of it — the figures are cumulative. */
export const PUBLIC_PLAYER_GAMES_LIMIT = 1000;

type Opponent = {
  id: number;
  slug: string;
  name: string;
  /** Carried through from the roster row: the face pile up here is the only
   *  picture of the rival on this page, and the roster already has it. */
  avatar_url: string | null;
  wins: number;
  losses: number;
};

/**
 * A person's public profile: who they play for, how often they win, and what
 * they have played lately.
 *
 * One page per human, across however many clubs they are in — the record is the
 * sum of all of them. Before people split out of players this was one page per
 * membership, so somebody in three clubs had three profiles each showing a third
 * of their history.
 *
 * The club's own player page has a win-rate chart, a challenge button and a
 * training plan. None of those belongs here — two are actions only a member can
 * take, and the third is somebody's practice diary.
 */
export default function PublicPlayerPage() {
  const { t } = useT();
  const { person, origin } = route.useLoaderData();

  // useSuspenseQueries, not a useSuspenseQuery per membership: the number of
  // clubs is data, and a hook call per row of data is the one thing the rules of
  // hooks will not have. All of these are already primed by the route loader.
  const gameResults = useSuspenseQueries({
    queries: person.memberships.map((m) =>
      gamesQuery(m.club.id, {
        playerId: m.id,
        pageSize: PUBLIC_PLAYER_GAMES_LIMIT,
      }),
    ),
  });
  const rosterResults = useSuspenseQueries({
    queries: person.memberships.map((m) => publicClubRosterQuery(m.club.id)),
  });

  const games = gameResults.flatMap((r) => r.data.games);
  // A person's history spans every club they play for, and a result's public
  // page lives under its own club's slug — so the row needs the club the game
  // was played in, not "the" club.
  const slugByClub = new Map(
    person.memberships.map((m) => [m.club.id, m.club.slug]),
  );
  const roster: PublicPlayer[] = rosterResults.flatMap((r) => r.data);

  const stats = useMemo(() => {
    let played = 0;
    let won = 0;
    let racksWon = 0;
    let racksLost = 0;
    // Games arrive newest-first per club, so merge on time before taking ten.
    const results: { at: string; won: boolean }[] = [];
    const opponents = new Map<number, Opponent>();
    const byId = new Map(roster.map((p) => [p.id, p]));

    // Every player row this person holds. A game is theirs if any of them is on
    // it — which is what makes the record cross-club rather than per-club.
    const mine = new Set(person.memberships.map((m) => m.id));

    const addOpponent = (id: number | null, won: boolean) => {
      if (id === null || mine.has(id)) return;
      const player = byId.get(id);
      if (!player) return;
      // Keyed on the opponent's person, not their membership: beating the same
      // human in two different clubs is one rivalry, not two.
      const key = player.slug;
      const existing = [...opponents.values()].find((o) => o.slug === key);
      const entry = existing ?? {
        id,
        slug: player.slug,
        name: player.name,
        avatar_url: player.avatar_url,
        wins: 0,
        losses: 0,
      };
      if (won) entry.wins++;
      else entry.losses++;
      opponents.set(entry.id, entry);
    };

    for (const game of games) {
      const inTeam1 =
        mine.has(game.player_1_id) ||
        (game.player_1b_id !== null && mine.has(game.player_1b_id));
      const inTeam2 =
        mine.has(game.player_2_id) ||
        (game.player_2b_id !== null && mine.has(game.player_2b_id));
      if (!inTeam1 && !inTeam2) continue;

      played++;
      const forMe = inTeam1 ? game.player_1_score : game.player_2_score;
      const against = inTeam1 ? game.player_2_score : game.player_1_score;
      racksWon += forMe;
      racksLost += against;
      const playerWon = forMe > against;
      if (playerWon) won++;
      results.push({ at: game.played_at, won: playerWon });

      if (inTeam1) {
        addOpponent(game.player_2_id, playerWon);
        addOpponent(game.player_2b_id, playerWon);
      } else {
        addOpponent(game.player_1_id, playerWon);
        addOpponent(game.player_1b_id, playerWon);
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
      last10: results
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 10)
        .map((r) => r.won),
      topOpponents,
    };
  }, [games, roster, person.memberships]);

  // Newest first across every club, which is not what concatenating the
  // per-club lists gives.
  const history = useMemo(
    () => [...games].sort((a, b) => b.played_at.localeCompare(a.played_at)),
    [games],
  );

  const url = `${origin}/players/${person.slug}`;

  return (
    <>
      <PlayerHero person={person} stats={stats} url={url} />

      <PublicShell>
        {stats.played === 0 ? (
          <Card className="mt-6">
            <EmptyState
              title={t("players.noGamesTitle")}
              hint={t("players.noGamesHint", { name: person.name })}
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
                      key={opponent.slug}
                      to="/players/$playerSlug"
                      params={{ playerSlug: opponent.slug }}
                      className="group flex flex-col items-center gap-2 text-center"
                    >
                      <Avatar
                        name={opponent.name}
                        url={opponent.avatar_url}
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
                {/* No playerId: the accent marks the frames this person won,
                    and across clubs there is no single membership id to test.
                    GamesList takes one id, so it gets none. */}
                <GamesList
                  games={history}
                  players={roster}
                  showDates
                  public
                  clubSlugOf={(game) => slugByClub.get(game.club_id)}
                />
              </div>
            </Card>
          </>
        )}
      </PublicShell>
    </>
  );
}
