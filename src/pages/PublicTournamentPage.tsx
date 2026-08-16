import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { LuGitFork, LuList } from "react-icons/lu";
import PublicShell from "@/components/PublicShell";
import ShareButton from "@/components/ShareButton";
import BracketView from "@/components/BracketView";
import LeagueTable from "@/components/LeagueTable";
import MatchList from "@/components/MatchList";
import TournamentPodium from "@/components/TournamentPodium";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardHeader } from "@/components/ui/Card";
import { CategoryBadge } from "@/components/ui/Ball";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHead } from "@/components/ui/SectionHead";
import { Segmented } from "@/components/ui/Segmented";
import { buttonClasses } from "@/components/ui/buttonStyles";
import {
  bracketIndex,
  groupCount,
  placings,
  raceFor,
  resolveBracket,
} from "@/libs/bracket";
import type { Places } from "@/libs/bracket";
import { groupStandings, leaguePodium, standings } from "@/libs/leagueTable";
import { publicClubRosterQuery } from "@/queries/public";
import type { PublicTournament } from "@/queries/public";
import { FORMAT_KEY, type Player, type TournamentMatch } from "@/types";
import { useT } from "@/i18n";

const route = getRouteApi("/_public/tournaments/$tournamentId");

type View = "bracket" | "list";

/**
 * A tournament as a stranger sees it: the draw, the standings, the podium.
 *
 * Read-only, and that is the whole difference from the club's own page — no
 * manage panel, no entry buttons, no way to file a result. `onRecord` returning
 * null for every fixture is what tells the shared bracket components that: they
 * already handle "this viewer cannot file this one", because a member who is not
 * in the club is in the same position.
 */
export default function PublicTournamentPage() {
  const { t } = useT();
  // The tournament comes from the loader rather than from a query: the loader
  // already threw notFound() if there wasn't one, so this is non-null here,
  // whereas publicTournamentQuery's own type is nullable — and narrowing it with
  // an early return would put a hook call behind a condition.
  const { tournament, origin } = route.useLoaderData();
  const [view, setView] = useState<View>("bracket");

  const { data: roster } = useSuspenseQuery(
    publicClubRosterQuery(tournament.club_id),
  );

  const byId = new Map(roster.map((p) => [p.id, p]));
  const nameOf = (id: number) => byId.get(id)?.name ?? t("tournaments.tbd");
  // Out here a name links to the person, not to the membership, so the shared
  // bracket components need the slug alongside the name. Inside a club they get
  // neither — PlayerLink uses the club route there.
  const slugOf = (id: number) => byId.get(id)?.slug;

  const entrantIds = tournament.tournament_players.map((e) => e.player_id);
  // resolveBracket fills each empty seat from the match that feeds it, so a draw
  // reads forward rather than only backward.
  const matches = resolveBracket(
    tournament.tournament_matches as TournamentMatch[],
  );
  const index = bracketIndex(matches);
  const raceOf = (match: TournamentMatch) =>
    raceFor(match, tournament, matches);

  const isLeague = tournament.format === "league";
  const isGroups = tournament.format === "group_knockout";
  const groups = groupCount(tournament.advance ?? 2);
  const groupMatches = matches.filter((m) => m.bracket === "group");

  const podium = isLeague
    ? leaguePodium(standings(entrantIds, matches))
    : placings(matches);
  const finished = tournament.status === "done";

  const played = matches.filter((m) => m.winner_id !== null).length;

  const url = `${origin}/tournaments/${tournament.id}`;

  return (
    <>
      <TournamentHero
        tournament={tournament}
        entrantIds={entrantIds}
        byId={byId}
        podium={podium}
        matchesTotal={matches.length}
        matchesPlayed={played}
        url={url}
      />

      <PublicShell>
        {entrantIds.length > 0 && (
          <section className="mt-6">
            <SectionHead title={t("public.publicTournament.entrantsLabel")} />
            <div className="mt-5 grid grid-cols-4 gap-4 sm:grid-cols-6 lg:grid-cols-8">
              {entrantIds.map((id) => {
                const player = byId.get(id);
                return (
                  <Link
                    key={id}
                    to="/players/$playerSlug"
                    params={{ playerSlug: player?.slug ?? "" }}
                    className="group flex flex-col items-center gap-1.5 text-center"
                  >
                    <Avatar
                      name={player?.name ?? "—"}
                      url={player?.avatar_url}
                      seed={id}
                      className="h-14 w-14 transition-transform duration-150 group-hover:scale-105 sm:h-16 sm:w-16"
                    />
                    <span className="w-full truncate text-caption text-ink-soft group-hover:text-ink">
                      {player?.name ?? "—"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {finished && (
          <section
            data-ball={tournament.club?.theme_color}
            className="wash wash-soft mt-10 overflow-hidden rounded-sheet border border-hairline"
          >
            <h2 className="px-6 pt-6 text-h3 font-semibold tracking-tight text-ink">
              {t("tournaments.results")}
            </h2>
            <TournamentPodium places={podium} byId={byId} />
          </section>
        )}

        {matches.length === 0 ? (
          <Card className="mt-10">
            <EmptyState
              icon={<LuGitFork className="h-5 w-5" aria-hidden />}
              title={t("public.publicTournament.notDrawnTitle")}
              hint={t("public.publicTournament.notDrawnHint")}
            />
          </Card>
        ) : isLeague ? (
          <Card className="mt-10 overflow-hidden">
            <CardHeader title={t("tournaments.standings")} />
            <LeagueTable
              rows={standings(entrantIds, matches)}
              nameOf={nameOf}
              slugOf={slugOf}
            />
          </Card>
        ) : (
          <>
            {isGroups && (
              <div className="mt-10 grid gap-4 lg:grid-cols-2">
                {groupStandings(entrantIds, groupMatches, groups).map(
                  (rows, group) => (
                    <Card key={group} className="overflow-hidden">
                      <CardHeader
                        title={t("tournaments.group", { n: group + 1 })}
                      />
                      <LeagueTable
                        rows={rows}
                        nameOf={nameOf}
                        slugOf={slugOf}
                        qualify={tournament.advance ? 2 : 0}
                      />
                    </Card>
                  ),
                )}
              </div>
            )}

            <div className="mt-10 flex items-center justify-between gap-3">
              <h2 className="text-h3 font-semibold text-ink">
                {t("public.publicTournament.draw")}
              </h2>
              <Segmented
                label={t("tournaments.view")}
                value={view}
                onChange={setView}
                options={[
                  {
                    value: "bracket",
                    label: t("tournaments.viewBracket"),
                    icon: <LuGitFork className="h-3.5 w-3.5" aria-hidden />,
                  },
                  {
                    value: "list",
                    label: t("tournaments.viewList"),
                    icon: <LuList className="h-3.5 w-3.5" aria-hidden />,
                  },
                ]}
              />
            </div>

            <div className="mt-3">
              {view === "bracket" ? (
                <BracketView
                  matches={matches}
                  nameOf={nameOf}
                  slugOf={slugOf}
                  index={index}
                  raceFor={raceOf}
                  onRecord={() => null}
                />
              ) : (
                <MatchList
                  matches={matches}
                  nameOf={nameOf}
                  slugOf={slugOf}
                  index={index}
                  raceFor={raceOf}
                  onRecord={() => null}
                />
              )}
            </div>
          </>
        )}

        {tournament.club && (
          <Link
            to="/clubs/$slug"
            params={{ slug: tournament.club.slug }}
            data-ball={tournament.club.theme_color}
            className="wash wash-soft lift mt-10 flex flex-col items-center gap-4 rounded-sheet border border-hairline p-8 text-center sm:flex-row sm:justify-between sm:text-left"
          >
            <div className="flex items-center gap-3">
              <Avatar
                name={tournament.club.name}
                url={tournament.club.logo_url}
                mark
                shape="plate"
                className="h-14 w-14"
              />
              <div>
                <p className="text-caption text-ink-faint">
                  {t("public.publicTournament.hostedBy")}
                </p>
                <p className="text-h3 font-semibold text-ink">
                  {tournament.club.name}
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
 * Status-driven, three shapes: `open` leads with the entrant count, `running`
 * with a live pill and a real progress bar, `done` with the champion's own
 * face — the one fact a stranger arriving at a finished tournament wants
 * first.
 */
function TournamentHero({
  tournament,
  entrantIds,
  byId,
  podium,
  matchesTotal,
  matchesPlayed,
  url,
}: {
  tournament: PublicTournament;
  entrantIds: number[];
  byId: Map<number, Pick<Player, "id" | "name" | "avatar_url">>;
  podium: Places;
  matchesTotal: number;
  matchesPlayed: number;
  url: string;
}) {
  const { t } = useT();
  const champion = podium.first !== null ? byId.get(podium.first) : undefined;
  const progress = matchesTotal > 0 ? matchesPlayed / matchesTotal : 0;

  return (
    <section
      data-ball={tournament.club?.theme_color}
      className="wash wash-soft relative overflow-hidden border-b border-hairline"
    >
      <div className="relative px-4 pt-10 pb-8 sm:px-6 sm:pt-16 sm:pb-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {tournament.club && (
              <Link
                to="/clubs/$slug"
                params={{ slug: tournament.club.slug }}
                className="inline-flex items-center gap-1.5 text-caption text-ink-soft transition-colors duration-150 hover:text-strike"
              >
                <Avatar
                  name={tournament.club.name}
                  url={tournament.club.logo_url}
                  mark
                  className="h-4 w-4"
                />
                {tournament.club.name}
              </Link>
            )}
            <h1 className="mt-1 truncate text-display leading-[1.05] font-semibold tracking-tighter text-ink">
              {tournament.name}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-faint">
              <span className="rounded-control border border-hairline bg-pocket px-1.5 py-0.5 font-mono tracking-[0.06em] text-ink-soft uppercase">
                {t(`tournaments.${FORMAT_KEY[tournament.format]}`)}
              </span>
              <span>
                {t(`discipline.${tournament.discipline}`)}
                {" · "}
                {t(`tournaments.status.${tournament.status}`)}
              </span>
              {tournament.category === null ? (
                <span>{t("tournaments.combined")}</span>
              ) : (
                <CategoryBadge category={tournament.category} />
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ShareButton title={tournament.name} url={url} />
          </div>
        </div>

        {tournament.status === "done" && champion ? (
          <div className="flood mt-8 flex items-center gap-4 rounded-sheet p-5 sm:p-6">
            <Avatar
              name={champion.name}
              url={champion.avatar_url}
              seed={champion.id}
              className="h-20 w-20 sm:h-24 sm:w-24"
            />
            <div className="min-w-0">
              <p className="text-caption font-semibold tracking-[0.08em] uppercase">
                {t("public.publicTournament.champion")}
              </p>
              <p className="truncate text-display leading-[1.05] font-semibold tracking-tighter">
                {champion.name}
              </p>
            </div>
          </div>
        ) : tournament.status === "running" ||
          tournament.status === "groups" ? (
          <div className="mt-8 max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pocket/70 px-2 py-1 font-mono text-caption font-semibold text-strike">
              <span
                className="live-dot h-1.5 w-1.5 rounded-full bg-strike"
                aria-hidden
              />
              {t("tournaments.status.running")}
            </span>
            {/* ponytail: track tinted from the fill color, not a surface token —
                the page bg here already equals felt-raised, so the track vanished */}
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-strike/20">
              <div
                className="h-full rounded-full bg-strike transition-[width] duration-500"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-2 font-mono text-caption tabular-nums text-ink-faint">
              {t("public.publicTournament.progress", {
                done: matchesPlayed,
                total: matchesTotal,
              })}
            </p>
          </div>
        ) : (
          <div className="mt-8 flex flex-wrap items-end gap-6">
            <div>
              <span className="font-mono text-display font-semibold tabular-nums text-ink">
                {entrantIds.length}
              </span>
              <p className="text-caption text-ink-faint">
                {t("public.publicTournament.entrantsLabel")}
              </p>
            </div>
            {entrantIds.length > 0 && (
              <div className="flex -space-x-2.5 pb-1.5">
                {entrantIds.slice(0, 8).map((id) => {
                  const player = byId.get(id);
                  return (
                    <Avatar
                      key={id}
                      name={player?.name ?? "—"}
                      url={player?.avatar_url}
                      seed={id}
                      className="h-9 w-9"
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
