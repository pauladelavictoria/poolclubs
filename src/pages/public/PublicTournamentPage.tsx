import { useState } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Link, getRouteApi, useRouter } from "@tanstack/react-router";
import { LuCalendar, LuGitFork, LuList, LuTicket } from "react-icons/lu";
import PublicShell from "@/components/layout/PublicShell";
import ShareButton from "@/components/social/ShareButton";
import BracketView from "@/components/tournaments/BracketView";
import LeagueTable from "@/components/tournaments/LeagueTable";
import MatchList from "@/components/games/MatchList";
import { PlayerHighlight } from "@/components/players/PlayerLink";
import TournamentPodium from "@/components/tournaments/TournamentPodium";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
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
} from "@/libs/algorithms/bracket";
import {
  groupStandings,
  leaguePodium,
  standings,
} from "@/libs/algorithms/leagueTable";
import { eventDates } from "@/libs/algorithms/eventDates";
import { runMutation } from "@/libs/browser/mutationToast";
import { supabase } from "@/libs/supabase/browser";
import { keys } from "@/libs/queryKeys";
import { useSession } from "@/hooks/useAuth";
import { publicClubRosterQuery } from "@/queries/public/clubs";
import type { PublicTournament } from "@/queries/public/tournaments";
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
    <PlayerHighlight>
      <TournamentHero
        tournament={tournament}
        entrantIds={entrantIds}
        byId={byId}
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
    </PlayerHighlight>
  );
}

/**
 * Status-driven: `open` leads with the entrant count, `running` with a live
 * pill and a real progress bar. A finished one leads with nothing — the results
 * section below it opens with the podium, and saying it twice on one screen read
 * as two different facts.
 */
function TournamentHero({
  tournament,
  entrantIds,
  byId,
  matchesTotal,
  matchesPlayed,
  url,
}: {
  tournament: PublicTournament;
  entrantIds: number[];
  byId: Map<number, Pick<Player, "id" | "name" | "avatar_url">>;
  matchesTotal: number;
  matchesPlayed: number;
  url: string;
}) {
  const { t, locale } = useT();
  const progress = matchesTotal > 0 ? matchesPlayed / matchesTotal : 0;
  const when = eventDates(tournament.starts_on, tournament.ends_on, locale);

  return (
    <section
      data-ball={tournament.club?.theme_color}
      className="wash wash-soft relative overflow-hidden border-b border-hairline"
    >
      <div className="relative px-4 pt-10 pb-8 sm:px-6 sm:pt-16 sm:pb-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {/* The title first, not the club above it: as an eyebrow it pushed
                the h1 a line and a half down, and a tournament page opened from a
                club page showed its title lower than the one before it. The club
                reads as well under the name, next to the rest of the facts. */}
            <h1 className="truncate text-display leading-[1.05] font-semibold tracking-tighter text-ink">
              {tournament.name}
            </h1>
            {tournament.club && (
              <Link
                to="/clubs/$slug"
                params={{ slug: tournament.club.slug }}
                className="mt-3 inline-flex max-w-full items-center gap-1.5 text-caption text-ink-soft transition-colors duration-150 hover:text-strike"
              >
                <Avatar
                  name={tournament.club.name}
                  url={tournament.club.logo_url}
                  mark
                  className="h-4 w-4 shrink-0"
                />
                <span className="truncate">{tournament.club.name}</span>
              </Link>
            )}
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
            {/* When it is and what it costs, on their own line rather than run
                in with the format and the discipline: those describe the draw,
                these two are what somebody deciding whether to turn up reads.
                Either can be missing — most tournaments open before they are
                dated. */}
            {(when || tournament.entry_fee) && (
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-body text-ink-soft">
                {when && (
                  <span className="flex items-center gap-1.5">
                    <LuCalendar className="h-4 w-4 shrink-0" aria-hidden />
                    {when}
                  </span>
                )}
                {tournament.entry_fee && (
                  <span className="flex items-center gap-1.5">
                    <LuTicket className="h-4 w-4 shrink-0" aria-hidden />
                    {tournament.entry_fee}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <TournamentEntry tournament={tournament} entrantIds={entrantIds} />
            <ShareButton title={tournament.name} url={url} />
          </div>
        </div>

        {/* Nothing under the title once it is finished: the results section
            below opens with the podium, and the champion's face twice on one
            screen made the second one look like a different fact. */}
        {tournament.status === "running" || tournament.status === "groups" ? (
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
        ) : tournament.status === "open" ? (
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
        ) : null}
      </div>
    </section>
  );
}

/**
 * The way in, for whoever is reading the page.
 *
 * Entering a tournament is a member's action — the RLS policy on
 * tournament_players wants an active player row in the host club and your own
 * user behind it (see sql/schema.sql) — so what this renders is whichever step
 * of that the visitor is missing: sign in, join the club, or enter. A stranger
 * who lands here from a share link gets a path rather than a disabled button.
 *
 * Only while entries are open. Once the draw is cut the field is fixed, and a
 * button that would always fail is worse than no button.
 *
 * The mutation is written here rather than reused from useManageTournaments:
 * that hook reads `useAuth`, which only exists under /app/$clubSlug. Out here
 * the membership comes off the root context instead.
 */
function TournamentEntry({
  tournament,
  entrantIds,
}: {
  tournament: PublicTournament;
  entrantIds: number[];
}) {
  const { t } = useT();
  const { session, memberships } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Their player row in *this* club. Someone can be a member of three clubs and
  // a pending request at a fourth; only an active row here can enter.
  const membership = memberships.find(
    (m) => m.club_id === tournament.club_id && m.status === "active",
  );
  const entered = !!membership && entrantIds.includes(membership.id);
  // A tournament limited to one division is not open to the others. Mirrors the
  // check the club's own page makes.
  const eligible =
    tournament.category === null ||
    membership?.category === tournament.category;

  const entry = useMutation({
    mutationFn: async () => {
      if (!membership) throw new Error("no player");
      if (entered) {
        await supabase
          .from("tournament_players")
          .delete()
          .eq("tournament_id", tournament.id)
          .eq("player_id", membership.id)
          .throwOnError();
      } else {
        await supabase
          .from("tournament_players")
          .insert([{ tournament_id: tournament.id, player_id: membership.id }])
          .throwOnError();
      }
    },
    onSuccess: async () => {
      // Both halves, for the reason useAuth's refresh gives: the query holds the
      // entrants, the route's loader holds the copy this page renders.
      await queryClient.invalidateQueries({
        queryKey: keys.public.tournament(tournament.id),
      });
      await router.invalidate();
    },
  });

  if (tournament.status !== "open") return null;

  if (!session) {
    return (
      <Link
        to="/app/login"
        search={{ next: `/tournaments/${tournament.id}` }}
        className={buttonClasses({ size: "sm" })}
      >
        {t("public.publicTournament.signInToEnter")}
      </Link>
    );
  }

  // Signed in, but not a player at this club yet — the invite link is the same
  // one the club hands out, and it comes back here afterwards.
  if (!membership) {
    return tournament.club ? (
      <Link
        to="/app/join/$slug"
        params={{ slug: tournament.club.slug }}
        className={buttonClasses({ size: "sm" })}
      >
        {t("public.publicTournament.joinClubToEnter")}
      </Link>
    ) : null;
  }

  if (!entered && !eligible) {
    return (
      <p className="max-w-[24ch] text-caption text-ink-faint">
        {t("tournaments.notEligible")}
      </p>
    );
  }

  return (
    <Button
      size="sm"
      variant={entered ? "secondary" : "primary"}
      disabled={entry.isPending}
      onClick={() =>
        runMutation(
          entry.mutateAsync(),
          t,
          entered ? "tournaments.left" : "tournaments.joined",
          "common.error",
          { denied: "common.deniedError" },
        )
      }
    >
      {entered ? t("tournaments.leave") : t("tournaments.join")}
    </Button>
  );
}
