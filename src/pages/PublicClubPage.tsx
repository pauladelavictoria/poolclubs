import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import ClubThemeStyle from "@/components/ClubThemeStyle";
import GamesList from "@/components/GamesList";
import ShareButton from "@/components/ShareButton";
import PublicShell from "@/components/PublicShell";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardHeader } from "@/components/ui/Card";
import { DisciplineBall } from "@/components/ui/Ball";
import { SectionHead } from "@/components/ui/SectionHead";
import { Shot } from "@/components/ui/Shot";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useEloRanking } from "@/hooks/useEloRanking";
import { gamesQuery } from "@/queries/games";
import {
  publicClubRosterQuery,
  publicTournamentsQuery,
} from "@/queries/public";
import type { PublicClub, PublicPlayer, PublicTournamentListItem } from "@/queries/public";
import type { DailyRankingEntry } from "@/types";
import { useT } from "@/i18n";

const route = getRouteApi("/_public/clubs/$slug");

/** Enough recent results to show the club is alive, not its whole history —
 *  which is what /clubs/$slug is for and the club's own app is not. */
export const CLUB_GAMES_LIMIT = 30;

/** How many of the ranking the podium prints. */
const TOP_N = 3;

const isLive = (status: PublicTournamentListItem["status"]) =>
  status === "running" || status === "groups";
const entrantsOf = (t: PublicTournamentListItem) =>
  t.tournament_players[0]?.count ?? 0;

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
  const onNow = tournaments.filter(
    (x) => isLive(x.status) || x.status === "open",
  );

  const playingSince = club.created_at
    ? new Date(club.created_at).getFullYear()
    : null;

  return (
    <>
      {/* The club wears its own accent out here too — it is the one thing that
          makes two of these pages look like different clubs. */}
      <ClubThemeStyle color={club.theme_color} />

      <ClubHero club={club} listed={listed} url={url} />

      <PublicShell>
        <div className="grid grid-cols-3 divide-x divide-hairline">
          <Stat value={club.member_count} label={t("public.publicClub.statMembers")} />
          <Stat value={gamesData.totalCount ?? 0} label={t("public.publicClub.statGames")} />
          {playingSince && (
            <Stat
              value={playingSince}
              label={t("public.publicClub.statSince", { year: playingSince })}
            />
          )}
        </div>

        <section className="mt-10">
          <SectionHead title={t("public.publicClub.tournaments")} />
          {onNow.length === 0 ? (
            <p className="mt-4 text-body text-ink-faint">
              {t("public.publicClub.noTournamentsTitle")}
            </p>
          ) : (
            <div className="no-bar -mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
              {onNow.map((tournament) => (
                <Link
                  key={tournament.id}
                  to="/tournaments/$tournamentId"
                  params={{ tournamentId: String(tournament.id) }}
                  className="lift flex w-56 shrink-0 snap-start flex-col gap-2 rounded-card border border-hairline bg-felt p-4"
                >
                  <div className="flex items-center justify-between">
                    <DisciplineBall discipline={tournament.discipline} className="h-6 w-6" />
                    {isLive(tournament.status) && (
                      <span className="live-dot h-1.5 w-1.5 rounded-full bg-strike" aria-hidden />
                    )}
                  </div>
                  <span className="truncate text-body font-medium text-ink">
                    {tournament.name}
                  </span>
                  <span className="font-mono text-caption tabular-nums text-ink-faint">
                    {t("tournaments.entrants", { n: entrantsOf(tournament) })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <SectionHead title={t("public.publicClub.topPlayers")} />
          {top.length === 0 ? (
            <p className="mt-4 text-body text-ink-faint">
              {t("public.publicClub.noRankingHint")}
            </p>
          ) : (
            <LeaderboardPodium entries={top} />
          )}
        </section>

        <section className="mt-10">
          <SectionHead title={t("public.publicClub.roster")} />
          {listed.length === 0 ? (
            <p className="mt-4 text-body text-ink-faint">
              {t("public.publicClub.noRosterHint")}
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-4 gap-4 sm:grid-cols-6 lg:grid-cols-8">
              {listed.map((player) => (
                <Link
                  key={player.id}
                  to="/players/$playerId"
                  params={{ playerId: String(player.id) }}
                  className="group flex flex-col items-center gap-1.5 text-center"
                >
                  <Avatar
                    name={player.name}
                    url={player.avatar_url}
                    seed={player.id}
                    className="h-16 w-16 transition-transform duration-150 group-hover:scale-105 sm:h-20 sm:w-20"
                  />
                  <span className="w-full truncate text-caption text-ink-soft group-hover:text-ink">
                    {player.name}
                  </span>
                </Link>
              ))}
            </div>
          )}
          {/* Said plainly rather than left as a discrepancy the reader has to
              spot between the count above and the length of this list. */}
          {club.member_count > listed.length && (
            <p className="mt-4 text-caption text-ink-faint">
              {t("public.publicClub.hiddenMembers", {
                n: club.member_count - listed.length,
              })}
            </p>
          )}
        </section>

        <Card className="mt-10 overflow-hidden">
          <CardHeader title={t("public.publicClub.recentResults")} />
          <div className="p-3">
            <GamesList games={gamesData.games} showDates public />
          </div>
        </Card>

        <section
          data-ball={club.theme_color}
          className="wash mt-10 flex flex-col items-center gap-3 rounded-sheet border border-hairline p-10 text-center"
        >
          <h2 className="max-w-[24ch] text-h1 font-semibold tracking-tight text-ink md:text-display">
            {t("public.publicClub.joinTitle", { name: club.name })}
          </h2>
          <p className="max-w-[46ch] text-body text-ink-soft">
            {t("public.publicClub.joinBody")}
          </p>
          <Link to="/app" className={buttonClasses({ className: "mt-2 px-6" })}>
            {t("public.cta.joinClub")}
          </Link>
        </section>
      </PublicShell>
    </>
  );
}

/**
 * Full-bleed, the Patreon creator-header shape: a cover band, the logo plate
 * overlapping it, the name at display size, the roster as the social-proof
 * line underneath. Rendered as a sibling of `PublicShell` rather than inside
 * it — that is what lets it bleed to the edges the shell's own measure would
 * otherwise clip.
 */
function ClubHero({
  club,
  listed,
  url,
}: {
  club: PublicClub;
  listed: PublicPlayer[];
  url: string;
}) {
  const { t } = useT();

  return (
    <section data-ball={club.theme_color} className="wash relative overflow-hidden border-b border-hairline">
      <Shot
        name={`club-${club.id}`}
        seed={`club-${club.id}`}
        size={[1600, 500]}
        alt=""
        priority
        className="absolute inset-0 h-full w-full opacity-35"
      />
      <div className="scrim absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6 sm:pt-16 sm:pb-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-6">
          <div className="w-fit rounded-sheet bg-felt p-1.5">
            <Avatar
              name={club.name}
              url={club.logo_url}
              shape="plate"
              className="h-20 w-20 sm:h-28 sm:w-28"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-h1 font-semibold tracking-tight text-ink md:text-display">
              {club.name}
            </h1>
            {listed.length > 0 && (
              <div className="mt-3 flex items-center gap-2.5">
                <div className="flex -space-x-2.5">
                  {listed.slice(0, 6).map((player) => (
                    <Avatar
                      key={player.id}
                      name={player.name}
                      url={player.avatar_url}
                      seed={player.id}
                      className="h-8 w-8"
                    />
                  ))}
                </div>
                <span className="text-caption text-ink-soft">
                  {t("public.publicClubs.members", { n: club.member_count })}
                </span>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ShareButton title={club.name} url={url} />
            <Link to="/app" className={buttonClasses({ size: "sm" })}>
              {t("public.cta.joinClub")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-4 text-center">
      <span className="font-mono text-display font-semibold tabular-nums text-ink">
        {value}
      </span>
      <span className="text-caption text-ink-faint">{label}</span>
    </div>
  );
}

/** Second on the left, winner in the middle, third on the right: the shape of
 *  a real podium, read middle-first rather than left-to-right — same grammar
 *  as `TournamentPodium`, keyed to win rate instead of a bracket's placings. */
const HEIGHT: Record<number, string> = { 1: "h-16", 2: "h-11", 3: "h-8" };

function LeaderboardPodium({ entries }: { entries: DailyRankingEntry[] }) {
  const steps = [
    entries[1] && { entry: entries[1], rank: 2 },
    entries[0] && { entry: entries[0], rank: 1 },
    entries[2] && { entry: entries[2], rank: 3 },
  ].filter((step): step is { entry: DailyRankingEntry; rank: number } => Boolean(step));

  return (
    <div className="mt-4 flex items-end justify-center gap-3 sm:gap-6">
      {steps.map(({ entry, rank }) => {
        const winRate =
          entry.gamesPlayed > 0
            ? `${Math.round((entry.gamesWon / entry.gamesPlayed) * 100)}%`
            : "—";
        return (
          <Link
            key={entry.playerId}
            to="/players/$playerId"
            params={{ playerId: String(entry.playerId) }}
            className="group flex min-w-0 flex-1 basis-0 flex-col items-center gap-2 sm:max-w-40"
          >
            <span className="line-clamp-2 text-center text-caption font-medium text-ink transition-colors duration-150 group-hover:text-strike">
              {entry.playerName}
            </span>
            <span className="font-mono text-caption tabular-nums text-ink-faint">
              {winRate}
            </span>
            <div
              className={`flex w-full items-center justify-center rounded-t-control border border-b-0 border-hairline bg-felt-raised ${HEIGHT[rank]}`}
            >
              <span
                className={`font-mono font-semibold tabular-nums ${
                  rank === 1 ? "text-h2 text-strike" : "text-h3 text-ink-soft"
                }`}
              >
                {rank}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
