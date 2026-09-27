import { useEffect, useRef, useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi, useRouter } from "@tanstack/react-router";
import { LuGitFork, LuList, LuX } from "react-icons/lu";
import PublicShell from "@/components/layout/PublicShell";
import TournamentSocialBar from "@/components/social/TournamentSocialBar";
import BracketView from "@/components/tournaments/BracketView";
import LeagueTable from "@/components/tournaments/LeagueTable";
import MatchList from "@/components/games/MatchList";
import MatchCard, { type MatchLive } from "@/components/games/MatchCard";
import LeagueFixtures from "@/components/tournaments/LeagueFixtures";
import YoutubeEmbed from "@/components/live/YoutubeEmbed";
import { PlayerCountries } from "@/components/players/PlayerCountries";
import { PlayerHighlight } from "@/components/players/PlayerHighlight";
import TournamentPodium from "@/components/tournaments/TournamentPodium";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHead } from "@/components/ui/SectionHead";
import { Segmented } from "@/components/ui/Segmented";
import { buttonClasses } from "@/components/ui/buttonStyles";
import {
  bracketIndex,
  groupCount,
  raceFor,
  resolveBracket,
  qualifyMarks,
  tournamentResults,
} from "@/libs/algorithms/bracket";
import { groupStandings } from "@/libs/algorithms/leagueTable";
import { pairNameOf, partnersOf } from "@/libs/algorithms/pairs";
import {
  publicClubRosterQuery,
  publicClubTablesQuery,
} from "@/queries/public/clubs";
import { publicTournamentLiveQuery } from "@/queries/public/live";
import { useTournamentBroadcasts } from "@/hooks/useClubYoutube";
import { type TournamentMatch } from "@/types";
import { useT } from "@/i18n";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { TournamentHero } from "@/components/public/TournamentHero";

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
  // In a couples tournament an entrant is a pair, under its captain's id.
  const partners = partnersOf(tournament.tournament_players);
  const nameOf = pairNameOf(
    partners,
    (id) => byId.get(id)?.name ?? t("tournaments.tbd"),
  );
  // Out here a name links to the person, not to the membership, so the shared
  // bracket components need the slug alongside the name. Inside a club they get
  // neither — PlayerLink uses the club route there.
  const slugOf = (id: number) => byId.get(id)?.slug;

  const entrantIds = tournament.tournament_players.map((e) => e.player_id);
  /** Entrants by id, named as entrants — a pair's two names on one person. */
  const entrantById = new Map(
    entrantIds.flatMap((id) => {
      const p = byId.get(id);
      return p ? [[id, { ...p, name: nameOf(id) }] as const] : [];
    }),
  );
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

  const { podium, table: leagueRows } = tournamentResults(
    tournament,
    entrantIds,
    matches,
  );
  const finished = tournament.status === "done";

  const played = matches.filter((m) => m.winner_id !== null).length;

  const url = `${origin}/tournaments/${tournament.id}`;

  // What is on the tables right now, and what there is to watch. Polled only
  // while a fixture can still be in play; a finished event is a snapshot.
  const running =
    tournament.status === "running" || tournament.status === "groups";
  const { data: live = [] } = useQuery({
    ...publicTournamentLiveQuery(
      tournament.id,
      tournament.club_id,
      new Set(matches.map((m) => m.id)),
    ),
    enabled: running,
  });
  const { data: broadcasts } = useTournamentBroadcasts(tournament.id, running);
  const { data: tables } = useQuery({
    ...publicClubTablesQuery(tournament.club_id),
    enabled: live.length > 0,
  });
  const [watching, setWatching] = useState<string | null>(null);

  const liveByFixture = new Map(live.map((l) => [l.tournament_match_id!, l]));
  const liveOf = (match: TournamentMatch): MatchLive | undefined => {
    const row = liveByFixture.get(match.id);
    const broadcast = row
      ? broadcasts?.live[row.id]
      : match.game_id
        ? broadcasts?.games[match.game_id]
        : undefined;
    const onWatch = broadcast ? () => setWatching(broadcast) : undefined;
    if (!row) return onWatch && { onWatch };
    // The live row seats whoever sat down first; the card reads fixture order.
    const flipped = row.player_1_id !== match.p1_id;
    return {
      score: flipped
        ? [row.player_2_score, row.player_1_score]
        : [row.player_1_score, row.player_2_score],
      onWatch,
    };
  };

  // A live row going away is a result being filed: reload the draw so the
  // winner moves on. ponytail: can trail by the public CDN TTL (a minute).
  const router = useRouter();
  const liveKey = live.map((l) => l.id).join();
  const lastLive = useRef(liveKey);
  useEffect(() => {
    const gone = lastLive.current
      .split(",")
      .some((id) => id && !liveKey.includes(id));
    lastLive.current = liveKey;
    if (gone) void router.invalidate();
  }, [liveKey, router]);

  return (
    <PlayerCountries players={roster}>
      <PlayerHighlight>
        <TournamentHero
          tournament={tournament}
          entrantIds={entrantIds}
          partners={partners}
          matchesTotal={matches.length}
          matchesPlayed={played}
          url={url}
        />

        <PublicShell>
          {/* Only while it is still open. Once it is under way the standings, the
            bracket and the results say who is in it and how they are doing — a
            flat grid of faces above them is the same list with the answer taken
            out. */}
          {tournament.status === "open" && entrantIds.length > 0 && (
            <section className="mt-6">
              <SectionHead title={t("public.publicTournament.entrantsLabel")} />
              <div className="mt-5 grid grid-cols-4 gap-4 sm:grid-cols-6 lg:grid-cols-8">
                {/* Everyone entered, partners too: a face is one person. */}
                {[...entrantIds, ...partners.values()].map((id) => {
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
                        <CountryFlag country={player?.country} />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {finished && (
            <section className="wash wash-soft mt-10 overflow-hidden rounded-sheet border border-hairline">
              <h2 className="px-6 pt-6 text-h3 font-semibold tracking-tight text-ink">
                {t("tournaments.results")}
              </h2>
              <TournamentPodium
                places={podium}
                byId={byId}
                partners={partners}
              />
            </section>
          )}

          {live.length > 0 && (
            <section className="mt-10">
              <h2 className="flex items-center gap-2 text-h3 font-semibold text-ink">
                <span
                  className="live-dot h-2 w-2 rounded-full bg-strike"
                  aria-hidden
                />
                {t("public.publicTournament.liveNow")}
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {matches
                  .filter((m) => liveByFixture.has(m.id))
                  .map((match) => {
                    const table = tables?.find(
                      (tb) => tb.id === liveByFixture.get(match.id)!.table_id,
                    );
                    return (
                      <div key={match.id}>
                        <p className="mb-1 px-1 text-caption text-ink-faint">
                          {table && `${t("live.table")} ${table.label} · `}
                          {t("tournaments.raceLabel", { n: raceOf(match) })}
                        </p>
                        <MatchCard
                          match={match}
                          nameOf={nameOf}
                          slugOf={slugOf}
                          clubSlug={tournament.club?.slug}
                          index={index}
                          live={liveOf(match)}
                        />
                      </div>
                    );
                  })}
              </div>
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
              <LeagueTable
                title={t("tournaments.standings")}
                rows={leagueRows}
                matches={matches}
                nameOf={nameOf}
                slugOf={slugOf}
                categoryOf={
                  tournament.categories?.length !== 1 &&
                  tournament.mode === "single"
                    ? (id) => byId.get(id)?.category
                    : undefined
                }
                showPoints
                points={{
                  win: tournament.points_win,
                  play: tournament.points_play,
                }}
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
                          qualify={qualifyMarks(tournament.status)}
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
                    clubSlug={tournament.club?.slug}
                    index={index}
                    raceFor={raceOf}
                    onRecord={() => null}
                    liveOf={liveOf}
                  />
                ) : (
                  <MatchList
                    matches={matches}
                    nameOf={nameOf}
                    slugOf={slugOf}
                    clubSlug={tournament.club?.slug}
                    index={index}
                    raceFor={raceOf}
                    onRecord={() => null}
                    liveOf={liveOf}
                  />
                )}
              </div>
            </>
          )}

          {isLeague && matches.length > 0 && (
            <div className="mt-10">
              <LeagueFixtures
                matches={matches}
                personOf={(id) => entrantById.get(id) ?? byId.get(id)}
                clubSlug={tournament.club?.slug}
                playerIds={entrantIds}
                liveOf={liveOf}
              />
            </div>
          )}

          {/* Under the results, not beside them: the draw is what the page is
            for, and the talk about it is what you reach after reading it. */}
          <TournamentSocialBar
            tournamentId={tournament.id}
            clubId={tournament.club_id}
          />

          {tournament.club && (
            <Link
              to="/clubs/$slug"
              params={{ slug: tournament.club.slug }}
              className="wash wash-soft lift mt-10 flex flex-col items-center gap-4 rounded-sheet border border-hairline p-8 text-center sm:flex-row sm:justify-between sm:text-left"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  name={tournament.club.name}
                  url={tournament.club.logo_url}
                  mark
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

        {watching && (
          <div className="fixed bottom-4 right-4 z-40 w-96 max-w-[calc(100%-2rem)] overflow-hidden rounded-card bg-felt-raised shadow-lg">
            <div className="flex justify-end">
              <IconButton
                label={t("common.close")}
                size="sm"
                onClick={() => setWatching(null)}
              >
                <LuX className="h-4 w-4" aria-hidden />
              </IconButton>
            </div>
            <YoutubeEmbed
              key={watching}
              broadcastId={watching}
              title={t("live.watch")}
              autoplay
            />
          </div>
        )}
      </PlayerHighlight>
    </PlayerCountries>
  );
}
