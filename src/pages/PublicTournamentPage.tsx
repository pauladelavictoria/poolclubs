import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { LuGitFork, LuList, LuUsers } from "react-icons/lu";
import PublicShell from "@/components/PublicShell";
import ClubThemeStyle from "@/components/ClubThemeStyle";
import ShareButton from "@/components/ShareButton";
import BracketView from "@/components/BracketView";
import LeagueTable from "@/components/LeagueTable";
import MatchList from "@/components/MatchList";
import TournamentPodium from "@/components/TournamentPodium";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardHeader } from "@/components/ui/Card";
import { CategoryBadge } from "@/components/ui/Ball";
import { EmptyState } from "@/components/ui/EmptyState";
import { Segmented } from "@/components/ui/Segmented";
import { buttonClasses } from "@/components/ui/buttonStyles";
import {
  bracketIndex,
  groupCount,
  placings,
  raceFor,
  resolveBracket,
} from "@/libs/bracket";
import { groupStandings, leaguePodium, standings } from "@/libs/leagueTable";
import { publicClubRosterQuery } from "@/queries/public";
import { FORMAT_KEY, type TournamentMatch } from "@/types";
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

  const entrants = tournament.tournament_players.map((e) => e.player_id);
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
    ? leaguePodium(standings(entrants, matches))
    : placings(matches);
  const finished = tournament.status === "done";

  const url = `${origin}/tournaments/${tournament.id}`;

  return (
    <>
      <ClubThemeStyle color={tournament.club?.theme_color} />

      <PublicShell>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start">
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
                  className="h-4 w-4"
                />
                {tournament.club.name}
              </Link>
            )}
            <h1 className="mt-1 text-h1 font-semibold tracking-tight text-ink">
              {tournament.name}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-faint">
              <span className="rounded-control border border-hairline bg-pocket px-1.5 py-0.5 font-mono uppercase tracking-[0.06em] text-ink-soft">
                {t(`tournaments.${FORMAT_KEY[tournament.format]}`)}
              </span>
              <span>
                {t(`discipline.${tournament.discipline}`)}
                {" · "}
                {t(`tournaments.status.${tournament.status}`)}
              </span>
              <span className="flex items-center gap-1 font-mono tabular-nums">
                <LuUsers className="h-3.5 w-3.5" aria-hidden />
                {entrants.length}
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
            <Link
              to="/app"
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              {t("public.cta.signIn")}
            </Link>
          </div>
        </header>

        {finished && (
          <Card className="mt-6 overflow-hidden">
            <CardHeader title={t("tournaments.results")} />
            <TournamentPodium places={podium} byId={byId} />
          </Card>
        )}

        {matches.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon={<LuGitFork className="h-5 w-5" aria-hidden />}
              title={t("public.publicTournament.notDrawnTitle")}
              hint={t("public.publicTournament.notDrawnHint")}
            />
          </Card>
        ) : isLeague ? (
          <Card className="mt-6 overflow-hidden">
            <CardHeader title={t("tournaments.standings")} />
            <LeagueTable rows={standings(entrants, matches)} nameOf={nameOf} />
          </Card>
        ) : (
          <>
            {isGroups &&
              groupStandings(entrants, groupMatches, groups).map(
                (rows, group) => (
                  <Card key={group} className="mt-4 overflow-hidden">
                    <CardHeader
                      title={t("tournaments.group", { n: group + 1 })}
                    />
                    <LeagueTable
                      rows={rows}
                      nameOf={nameOf}
                      qualify={tournament.advance ? 2 : 0}
                    />
                  </Card>
                ),
              )}

            <div className="mt-6 flex items-center justify-between gap-3">
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
                  index={index}
                  raceFor={raceOf}
                  onRecord={() => null}
                />
              ) : (
                <MatchList
                  matches={matches}
                  nameOf={nameOf}
                  index={index}
                  raceFor={raceOf}
                  onRecord={() => null}
                />
              )}
            </div>
          </>
        )}
      </PublicShell>
    </>
  );
}
