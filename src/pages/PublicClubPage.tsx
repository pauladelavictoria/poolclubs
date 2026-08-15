import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { LuUsers } from "react-icons/lu";
import PublicShell from "@/components/PublicShell";
import ClubThemeStyle from "@/components/ClubThemeStyle";
import GamesList from "@/components/GamesList";
import ShareButton from "@/components/ShareButton";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardHeader } from "@/components/ui/Card";
import { CategoryBadge } from "@/components/ui/Ball";
import { cardClasses } from "@/components/ui/cardStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useEloRanking } from "@/hooks/useEloRanking";
import { gamesQuery } from "@/queries/games";
import {
  publicClubRosterQuery,
  publicTournamentsQuery,
} from "@/queries/public";
import type { PublicPlayer } from "@/queries/public";
import { TournamentRow } from "@/pages/PublicTournamentsPage";
import { useT } from "@/i18n";

const route = getRouteApi("/_public/clubs/$slug");

/** Enough recent results to show the club is alive, not its whole history —
 *  which is what /clubs/$slug is for and the club's own app is not. */
export const CLUB_GAMES_LIMIT = 30;

/** How many of the ranking's top the profile prints. */
const TOP_N = 5;

/**
 * A club's public face: who plays there, who is winning, what is on, and one way
 * in.
 *
 * It reads as a page rather than a dashboard on purpose — a stranger arriving
 * from a link has no idea what any of this is yet, so each block says what it is
 * before it says a number.
 */
export default function PublicClubPage() {
  const { t } = useT();
  const { club, origin } = route.useLoaderData();

  // The club itself comes from the loader — it already threw notFound() if there
  // wasn't one, so it is non-null here where the query's type is nullable. The
  // rest read from the cache the loader primed.
  const { data: roster } = useSuspenseQuery(publicClubRosterQuery(club.id));
  const { data: gamesData } = useSuspenseQuery(
    gamesQuery(club.id, { pageSize: CLUB_GAMES_LIMIT }),
  );
  const { data: tournamentsData } = useSuspenseQuery(
    publicTournamentsQuery({ clubId: club.id }),
  );

  const url = `${origin}/clubs/${club.slug}`;

  // Same hook and the same games the club's own ranking uses, so a figure here
  // is the figure a member sees — the whole roster goes in, opted-out members
  // included. Leaving them out would make the club's public ranking disagree
  // with its own, which is the club's record being edited by one person's
  // preference about being listed.
  const ranking = useEloRanking({
    games: gamesData.games,
    players: roster as PublicPlayer[],
  });
  const top = (ranking ?? []).slice(0, TOP_N);

  // The roster grid is the one block that is a list of people, so it is the one
  // place the opt-out applies. Everything else on this page is the club's record.
  const listed = roster.filter((player) => player.is_public);

  const tournaments = tournamentsData.tournaments;
  const live = tournaments.filter(
    (x) => x.status === "running" || x.status === "groups",
  );
  const open = tournaments.filter((x) => x.status === "open");
  const onNow = [...live, ...open];

  return (
    <>
      {/* The club wears its own accent out here too — it is the one thing that
          makes two of these pages look like different clubs. */}
      <ClubThemeStyle color={club.theme_color} />

      <PublicShell>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar
            name={club.name}
            url={club.logo_url}
            className="h-16 w-16 sm:h-20 sm:w-20"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-h1 font-semibold tracking-tight text-ink">
              {club.name}
            </h1>
            <p className="mt-1 text-body tabular-nums text-ink-soft">
              {t("public.publicClubs.members", { n: club.member_count })}
              {gamesData.totalCount
                ? ` · ${t("public.publicClub.gamesPlayed", {
                    n: gamesData.totalCount,
                  })}`
                : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ShareButton title={club.name} url={url} />
            <Link to="/app" className={buttonClasses({ size: "sm" })}>
              {t("public.cta.joinClub")}
            </Link>
          </div>
        </header>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader title={t("public.publicClub.topPlayers")} />
            {top.length === 0 ? (
              <EmptyState
                icon={<LuUsers className="h-5 w-5" aria-hidden />}
                title={t("public.publicClub.noRankingTitle")}
                hint={t("public.publicClub.noRankingHint")}
              />
            ) : (
              <ol className="divide-y divide-hairline">
                {top.map((entry, index) => (
                  <li key={entry.playerId}>
                    <Link
                      to="/players/$playerId"
                      params={{ playerId: String(entry.playerId) }}
                      className="flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 hover:bg-felt-raised"
                    >
                      <span className="w-5 shrink-0 font-mono text-caption tabular-nums text-ink-ghost">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-body text-ink">
                        {entry.playerName}
                      </span>
                      <span className="shrink-0 font-mono text-body font-semibold tabular-nums text-strike">
                        {entry.gamesPlayed > 0
                          ? `${Math.round(
                              (entry.gamesWon / entry.gamesPlayed) * 100,
                            )}%`
                          : "—"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title={t("public.publicClub.tournaments")} />
            {onNow.length === 0 ? (
              <EmptyState
                title={t("public.publicClub.noTournamentsTitle")}
                hint={t("public.publicClub.noTournamentsHint")}
              />
            ) : (
              <ul className="divide-y divide-hairline">
                {onNow.map((tournament) => (
                  <li key={tournament.id}>
                    <TournamentRow tournament={tournament} hideClub />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="mt-4 overflow-hidden">
          <CardHeader title={t("public.publicClub.roster")} />
          {listed.length === 0 ? (
            <EmptyState
              icon={<LuUsers className="h-5 w-5" aria-hidden />}
              title={t("public.publicClub.noRosterTitle")}
              hint={t("public.publicClub.noRosterHint")}
            />
          ) : (
            <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
              {listed.map((player) => (
                <Link
                  key={player.id}
                  to="/players/$playerId"
                  params={{ playerId: String(player.id) }}
                  className={cardClasses({
                    interactive: true,
                    className: "group flex items-center gap-2.5 p-2.5",
                  })}
                >
                  <Avatar
                    name={player.name}
                    url={player.avatar_url}
                    className="h-8 w-8"
                  />
                  <span className="min-w-0 flex-1 truncate text-body text-ink transition-colors duration-150 group-hover:text-strike">
                    {player.name}
                  </span>
                  <CategoryBadge category={player.category} />
                </Link>
              ))}
            </div>
          )}
          {/* Said plainly rather than left as a discrepancy the reader has to
              spot between the count above and the length of this list. */}
          {club.member_count > listed.length && (
            <p className="border-t border-hairline px-3 py-2.5 text-caption text-ink-faint">
              {t("public.publicClub.hiddenMembers", {
                n: club.member_count - listed.length,
              })}
            </p>
          )}
        </Card>

        <Card className="mt-4 overflow-hidden">
          <CardHeader title={t("public.publicClub.recentResults")} />
          <div className="p-3">
            <GamesList games={gamesData.games} showDates public />
          </div>
        </Card>
      </PublicShell>
    </>
  );
}
