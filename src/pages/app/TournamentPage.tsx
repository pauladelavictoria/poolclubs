import { useMemo, useState, type ReactNode } from "react";
import { toast } from "react-toastify";
import {
  LuChevronDown,
  LuGitFork,
  LuList,
  LuPencil,
  LuPlus,
  LuSettings,
  LuTrash2,
  LuUserMinus,
  LuUserPlus,
} from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useGetPlayers, usePlayerLookup } from "@/hooks/useGetPlayers";
import { useGetGames } from "@/hooks/useGetGames";
import { useEloRanking } from "@/hooks/useEloRanking";
import {
  useGetTournament,
  useManageTournaments,
  type TournamentDetail,
} from "@/hooks/useTournaments";
import {
  bracketIndex,
  eligible,
  groupCount,
  minimumEntrants,
  placings,
  raceFor,
  resolveBracket,
  type BracketIndex,
} from "@/libs/bracket";
import { groupStandings, standings, type Standing } from "@/libs/leagueTable";
import PageTitle from "@/components/layout/PageTitle";
import BracketView from "@/components/tournaments/BracketView";
import LeagueTable from "@/components/tournaments/LeagueTable";
import MatchCard from "@/components/games/MatchCard";
import MatchList from "@/components/games/MatchList";
import TournamentPodium from "@/components/tournaments/TournamentPodium";
import PlayGameForm from "@/components/games/PlayGameForm";
import { PlayerHighlight } from "@/components/players/PlayerLink";
import TournamentForm, {
  type TournamentValues,
} from "@/components/tournaments/TournamentForm";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { CategoryBadge } from "@/components/ui/Ball";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDialog } from "@/libs/useDialog";
import { FORMAT_KEY, type TournamentMatch } from "@/types";
import { useT } from "@/i18n";
import { getRouteApi } from "@tanstack/react-router";
import { AppLink } from "@/components/layout/AppLink";

const route = getRouteApi("/app/_authed/$clubSlug/tournaments/$tournamentId");

export default function TournamentPage() {
  const { t } = useT();
  const { tournamentId: tournamentIdParam } = route.useParams();
  const tournamentId = Number(tournamentIdParam);

  const { player, activeClubId, isClubAdmin, isMember } = useAuth();
  const { data: tournament, isLoading } = useGetTournament(tournamentId);
  const { data: players } = useGetPlayers();
  const { byId, nameOf } = usePlayerLookup();
  const { data: games } = useGetGames({});
  const elo = useEloRanking({ games: games?.games, players });

  const {
    updateTournament,
    deleteTournament,
    joinTournament,
    leaveTournament,
    startTournament,
    generateKnockout,
    recordResult,
  } = useManageTournaments();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const editRef = useDialog(isEditOpen);
  // Either a fixture tapped in the bracket, or "new" for the pick-the-players
  // route. Both end up filing a result against a fixture.
  const [playing, setPlaying] = useState<TournamentMatch | "new" | null>(null);
  const recordRef = useDialog(!!playing);
  const [adding, setAdding] = useState("");
  const [view, setView] = useState<"bracket" | "list">("list");

  const entrants = useMemo(
    () => (tournament?.tournament_players ?? []).map((e) => e.player_id),
    [tournament],
  );

  /** Strongest first, so the bracket seeds itself off the club's own ranking.
   *  Anyone with no games yet sits at the bottom, ordered by name. */
  const seeded = useMemo(() => {
    const rank = new Map((elo ?? []).map((e, i) => [e.playerId, i]));
    return [...entrants].sort(
      (a, b) =>
        (rank.get(a) ?? Number.MAX_SAFE_INTEGER) -
          (rank.get(b) ?? Number.MAX_SAFE_INTEGER) ||
        nameOf(a).localeCompare(nameOf(b)),
    );
  }, [entrants, elo, nameOf]);

  // The stored rows only hold the seats known at generation; this fills in the
  // rest from the results so far, and settles any walkover they created.
  const matches = useMemo(
    () => resolveBracket(tournament?.tournament_matches ?? []),
    [tournament],
  );

  // Built once from the whole tournament and handed to every view, so #12 is
  // the same match in the bracket, in the list and in a "loser of #12" seat.
  const index = useMemo(() => bracketIndex(matches), [matches]);

  if (isLoading) return <PageSkeleton />;
  // Someone in two clubs can reach the other club's tournament by URL — RLS
  // lets them read it, since they are a member there too. Acting on it would
  // enter the wrong player: `player` is the one for the club being viewed.
  if (!tournament || tournament.club_id !== activeClubId) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        <PageTitle title={t("nav.tournaments")} />
        <Card>
          <EmptyState
            title={t("tournaments.missing")}
            hint={tournament ? t("tournaments.otherClub") : undefined}
          />
        </Card>
      </div>
    );
  }

  const minimum = minimumEntrants(tournament.format, tournament.advance);
  const groups = groupCount(tournament.advance ?? 2);
  const entered = player ? entrants.includes(player.id) : false;
  const canEnter =
    tournament.category === null || player?.category === tournament.category;

  /** Who the organiser can still put in: the club roster this tournament is
   *  open to, minus whoever is already entered. */
  const addable = eligible(players ?? [], tournament.category).filter(
    (p) => !entrants.includes(p.id),
  );

  // A knockout's podium is who lost to whom; a league's is just the top of the
  // table, since there is no final to read it off.
  const podium =
    tournament.format === "league"
      ? leaguePodium(standings(entrants, matches))
      : placings(matches);

  const groupMatches = matches.filter((m) => m.bracket === "group");
  const groupsDone =
    groupMatches.length > 0 && groupMatches.every((m) => m.winner_id !== null);

  /** Anyone in the club can file a result, once both seats are filled. */
  const canPlay = isMember && tournament.status !== "done";
  const playable = (match: TournamentMatch) =>
    match.winner_id === null && match.p1_id !== null && match.p2_id !== null;

  const recorder = (match: TournamentMatch) =>
    canPlay && playable(match) ? () => setPlaying(match) : null;

  /** Most recent first — a league is read as "what happened lately", not as a
   *  calendar. Fixtures generated at the same time have no order of their own,
   *  so an unplayed one falls back to its number. */
  const playedMatches = matches
    .filter((m) => m.winner_id !== null)
    .sort((a, b) =>
      (b.game?.played_at ?? "").localeCompare(a.game?.played_at ?? ""),
    );
  const pendingMatches = matches.filter((m) => m.winner_id === null);

  /** The outstanding fixture between two entrants. A pair with nothing left to
   *  play has no match to file against, which is what stops a league turning
   *  into whoever-plays-most. */
  const findMatch = (a: number, b: number) =>
    matches.find(
      (m) =>
        m.winner_id === null &&
        ((m.p1_id === a && m.p2_id === b) || (m.p1_id === b && m.p2_id === a)),
    );

  const entrantPlayers = (players ?? []).filter((p) => entrants.includes(p.id));

  /** The race this fixture runs to, from how deep in the draw it sits. */
  const raceOf = (match: TournamentMatch) =>
    raceFor(match, tournament, matches);

  const run = async (work: Promise<unknown>, ok: Parameters<typeof t>[0]) => {
    try {
      await work;
      toast.success(t(ok));
    } catch {
      // Logged by the mutation cache; this is the part the user sees.
      toast.error(t("common.error"));
    }
  };

  /**
   * Running the tournament, folded away. These were three more cards in a stack
   * of eight that all looked alike, and they are the only ones most of the club
   * can't use at all — so they go last, behind a dashed disclosure, which is the
   * same "not the content" edge the feed already uses.
   */
  const adminBlock = !isClubAdmin ? null : tournament.status === "open" ? (
    <ManagePanel title={t("tournaments.manage")}>
      <p className="text-body text-ink-soft">
        {entrants.length < minimum
          ? t("tournaments.needMore", {
              n: minimum - entrants.length,
              min: minimum,
            })
          : t("tournaments.readyToStart", { n: entrants.length })}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={entrants.length < minimum || startTournament.isPending}
          onClick={() =>
            run(
              startTournament.mutateAsync({ tournament, seededIds: seeded }),
              "tournaments.started",
            )
          }
        >
          {t("tournaments.start")}
        </Button>
        <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
          <LuPencil className="h-4 w-4" aria-hidden />
          {t("common.edit")}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            if (
              !confirm(
                t("tournaments.deleteConfirm", { name: tournament.name }),
              )
            )
              return;
            run(
              deleteTournament.mutateAsync(tournamentId),
              "tournaments.deleted",
            );
          }}
        >
          <LuTrash2 className="h-4 w-4" aria-hidden />
          {t("common.delete")}
        </Button>
      </div>
    </ManagePanel>
  ) : tournament.status === "groups" ? (
    <ManagePanel title={t("tournaments.manage")}>
      <p className="text-body text-ink-soft">
        {groupsDone
          ? t("tournaments.groupsDone", { n: tournament.advance ?? 0 })
          : t("tournaments.groupsPending")}
      </p>
      <Button
        disabled={!groupsDone || generateKnockout.isPending}
        onClick={() =>
          run(
            generateKnockout.mutateAsync(tournament as TournamentDetail),
            "tournaments.knockoutReady",
          )
        }
      >
        {t("tournaments.generateKnockout")}
      </Button>
    </ManagePanel>
  ) : tournament.status === "running" ? (
    <ManagePanel title={t("tournaments.manage")}>
      <Button
        variant="secondary"
        onClick={() =>
          run(
            updateTournament.mutateAsync({ id: tournamentId, status: "done" }),
            "tournaments.closed",
          )
        }
      >
        {t("tournaments.close")}
      </Button>
    </ManagePanel>
  ) : null;

  return (
    <PlayerHighlight>
      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        <PageTitle title={tournament.name}>
          {tournament.category !== null && (
            <CategoryBadge category={tournament.category} />
          )}
          {/* Two people meet at a table and want it recorded there and then, so
              this is next to the tournament's name rather than buried beside a
              fixture. */}
          {canPlay && pendingMatches.some(playable) && (
            <Button size="sm" onClick={() => setPlaying("new")}>
              <LuPlus className="h-4 w-4" aria-hidden />
              {t("tournaments.addGame")}
            </Button>
          )}
        </PageTitle>

        {/* Discipline, format and state, on their own line: in the title's row
            they competed with the name for the same width and the name lost. */}
        <p className="-mt-2 text-caption text-ink-faint">
          {`${t(`discipline.${tournament.discipline}`)} · ${t(
            `tournaments.${FORMAT_KEY[tournament.format]}`,
          )} · ${t(`tournaments.status.${tournament.status}`)}`}
        </p>

        {/* A finished tournament leads with its result: the bracket below is
            then the story of how it got there, not the headline. */}
        {tournament.status === "done" && podium && (
          <Card className="overflow-hidden">
            <CardHeader title={t("tournaments.results")} />
            <TournamentPodium places={podium} byId={byId} />
          </Card>
        )}

        {/* The draw leads. It is the one thing everybody opens the page for
            once the tournament is under way, so it comes before the tables
            that explain it and long before the tools that run it. */}
        {matches.some(
          (m) => m.bracket !== "group" && m.bracket !== "league",
        ) && (
          <Card className="overflow-hidden">
            <CardHeader
              title={t("games.title")}
              action={
                <Segmented<"bracket" | "list">
                  value={view}
                  onChange={setView}
                  label={t("tournaments.view")}
                  options={[
                    {
                      value: "list",
                      label: t("tournaments.viewList"),
                      icon: <LuList className="h-4 w-4" aria-hidden />,
                    },
                    {
                      value: "bracket",
                      label: t("tournaments.viewBracket"),
                      icon: <LuGitFork className="h-4 w-4" aria-hidden />,
                    },
                  ]}
                />
              }
            />
            <div className="p-3">
              {view === "bracket" ? (
                <BracketView
                  matches={matches}
                  nameOf={nameOf}
                  index={index}
                  raceFor={raceOf}
                  onRecord={recorder}
                />
              ) : (
                <MatchList
                  matches={matches}
                  nameOf={nameOf}
                  index={index}
                  raceFor={raceOf}
                  onRecord={recorder}
                />
              )}
            </div>
          </Card>
        )}

        {tournament.status === "open" && (
          <Card className="overflow-hidden">
            <CardHeader
              title={t("tournaments.entrants", { n: entrants.length })}
              action={
                isMember &&
                canEnter && (
                  <Button
                    size="sm"
                    variant={entered ? "secondary" : "primary"}
                    disabled={
                      joinTournament.isPending || leaveTournament.isPending
                    }
                    onClick={() =>
                      run(
                        entered
                          ? leaveTournament.mutateAsync({ tournamentId })
                          : joinTournament.mutateAsync({ tournamentId }),
                        entered ? "tournaments.left" : "tournaments.joined",
                      )
                    }
                  >
                    {entered ? t("tournaments.leave") : t("tournaments.join")}
                  </Button>
                )
              }
            />
            {entrants.length === 0 ? (
              <EmptyState
                title={t("tournaments.noEntrants")}
                hint={
                  canEnter
                    ? t("tournaments.noEntrantsHint")
                    : t("tournaments.notEligible")
                }
              />
            ) : (
              <ul className="divide-y divide-hairline">
                {seeded.map((playerId, index) => (
                  <li
                    key={playerId}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span className="w-6 shrink-0 font-mono text-caption tabular-nums text-ink-faint">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-body text-ink">
                      <AppLink
                        to="/app/$clubSlug/players/$playerId"
                        params={{ playerId: playerId }}
                        className="transition-colors duration-150 hover:text-strike"
                      >
                        {nameOf(playerId)}
                      </AppLink>
                      {playerId === player?.id && (
                        <span className="ml-2 text-caption text-ink-faint">
                          {t("club.you")}
                        </span>
                      )}
                    </span>
                    {isClubAdmin && (
                      <IconButton
                        label={t("tournaments.removeNamed", {
                          name: nameOf(playerId),
                        })}
                        size="sm"
                        tone="danger"
                        onClick={() =>
                          run(
                            leaveTournament.mutateAsync({
                              tournamentId,
                              playerId,
                            }),
                            "tournaments.removed",
                          )
                        }
                      >
                        <LuUserMinus className="h-4 w-4" aria-hidden />
                      </IconButton>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Not everyone waits to be asked twice: the organiser can put a
                member in directly. Outside the list above, so it is there when
                nobody has entered yet. */}
            {isClubAdmin && (
              <div className="border-t border-hairline p-4">
                {addable.length === 0 ? (
                  <p className="text-caption text-ink-faint">
                    {t("tournaments.allEntered")}
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <Select
                      size="sm"
                      className="min-w-0 flex-1"
                      value={adding}
                      aria-label={t("tournaments.addPlayer")}
                      onChange={(e) => setAdding(e.target.value)}
                    >
                      <option value="">{t("tournaments.addPlayer")}</option>
                      {addable.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                    <Button
                      size="sm"
                      className="shrink-0"
                      disabled={!adding || joinTournament.isPending}
                      onClick={() => {
                        const playerId = Number(adding);
                        setAdding("");
                        run(
                          joinTournament.mutateAsync({
                            tournamentId,
                            playerId,
                          }),
                          "tournaments.added",
                        );
                      }}
                    >
                      <LuUserPlus className="h-4 w-4" aria-hidden />
                      {t("tournaments.add")}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Group tables stay up once the bracket is running: the bracket says
            who is left, the tables say how they got there. */}
        {groupMatches.length > 0 &&
          groupStandings(entrants, groupMatches, groups).map((rows, group) => (
            <Card key={group} className="overflow-hidden">
              <CardHeader title={t("tournaments.group", { n: group + 1 })} />
              <LeagueTable
                rows={rows}
                nameOf={nameOf}
                qualify={tournament.status === "groups" ? 2 : 0}
              />
              <div className="border-t border-hairline p-3">
                <Fixtures
                  matches={groupMatches.filter((m) => m.group_no === group + 1)}
                  nameOf={nameOf}
                  index={index}
                  recorder={recorder}
                />
              </div>
            </Card>
          ))}

        {tournament.format === "league" && matches.length > 0 && (
          <>
            <Card className="overflow-hidden">
              <CardHeader title={t("tournaments.standings")} />
              <LeagueTable
                rows={standings(entrants, matches)}
                nameOf={nameOf}
              />
            </Card>
            {/* What is left to arrange comes first: the played ones are a log,
                the pending ones are the thing anyone can act on. Once the
                tournament is closed nobody can, so they stop being news. */}
            {pendingMatches.length > 0 && tournament.status !== "done" && (
              <Card className="overflow-hidden">
                <CardHeader
                  title={t("tournaments.stillToPlay", {
                    n: pendingMatches.length,
                  })}
                />
                <div className="p-3">
                  <Fixtures
                    matches={pendingMatches}
                    nameOf={nameOf}
                    index={index}
                    recorder={recorder}
                  />
                </div>
              </Card>
            )}
            <Card className="overflow-hidden">
              <CardHeader
                title={t("tournaments.gamesPlayed", {
                  n: playedMatches.length,
                })}
              />
              {playedMatches.length === 0 ? (
                <EmptyState
                  title={t("tournaments.noGamesYet")}
                  hint={canPlay ? t("tournaments.noGamesHint") : undefined}
                />
              ) : (
                <div className="p-3">
                  <Fixtures
                    matches={playedMatches}
                    nameOf={nameOf}
                    index={index}
                    recorder={recorder}
                  />
                </div>
              )}
            </Card>
          </>
        )}

        {adminBlock && (
          // The seam between the tournament and the running of it. Everything
          // above is what a tournament is; everything below is a job, and only
          // one person on the page has it.
          <div className="border-t border-hairline pt-4">{adminBlock}</div>
        )}
      </div>

      <dialog
        ref={editRef}
        className="sheet m-0 mt-auto max-h-[90dvh] w-full max-w-none sm:max-w-md overflow-y-auto rounded-t-sheet border border-hairline bg-felt p-5 text-ink sm:m-auto sm:rounded-sheet"
        aria-label={t("tournaments.edit")}
        onClose={() => setIsEditOpen(false)}
        onClick={(e) => {
          if (e.target === editRef.current) setIsEditOpen(false);
        }}
      >
        <h2 className="mb-4 text-h3 font-semibold text-ink">
          {t("tournaments.edit")}
        </h2>
        {isEditOpen && (
          <TournamentForm
            initialValues={{
              name: tournament.name,
              format: tournament.format,
              category: tournament.category,
              legs: tournament.legs,
              advance: tournament.advance,
              single_from: tournament.single_from,
              discipline: tournament.discipline,
              race_to: tournament.race_to,
              race_semi: tournament.race_semi,
              race_final: tournament.race_final,
            }}
            isSubmitting={updateTournament.isPending}
            onCancel={() => setIsEditOpen(false)}
            onSubmit={(values: TournamentValues) => {
              setIsEditOpen(false);
              run(
                updateTournament.mutateAsync({ id: tournamentId, ...values }),
                "common.saved",
              );
            }}
          />
        )}
      </dialog>

      <dialog
        ref={recordRef}
        className="sheet m-0 mt-auto w-full max-w-none sm:max-w-md rounded-t-sheet border border-hairline bg-felt p-5 text-ink sm:m-auto sm:rounded-sheet"
        aria-label={t("tournaments.record")}
        onClose={() => setPlaying(null)}
        onClick={(e) => {
          if (e.target === recordRef.current) setPlaying(null);
        }}
      >
        {/* Mounted only while open, so the pickers start empty every time. */}
        {playing && (
          <PlayGameForm
            entrants={entrantPlayers}
            initialMatch={playing === "new" ? null : playing}
            findMatch={findMatch}
            raceFor={raceOf}
            isSubmitting={recordResult.isPending}
            onCancel={() => setPlaying(null)}
            onSubmit={(values) => {
              setPlaying(null);
              run(
                recordResult.mutateAsync({
                  ...values,
                  discipline: tournament.discipline,
                }),
                "tournaments.recorded",
              );
            }}
          />
        )}
      </dialog>
    </PlayerHighlight>
  );
}

/**
 * The organiser's controls. A native <details> — click to open, Esc, no state
 * and no outside-click listener — with a dashed edge, so it reads as scaffolding
 * around the tournament rather than another part of it.
 */
function ManagePanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-card border border-dashed border-hairline">
      <summary className="flex h-11 cursor-pointer list-none items-center gap-2 px-4 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint transition-colors duration-150 hover:text-ink-soft [&::-webkit-details-marker]:hidden">
        <LuSettings className="h-4 w-4" aria-hidden />
        {title}
        <LuChevronDown
          className="ml-auto h-4 w-4 transition-transform duration-150 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="space-y-3 border-t border-dashed border-hairline p-4">
        {children}
      </div>
    </details>
  );
}

/** A league has no final to read a podium off, so the table is the podium.
 *  Only the places the table can actually fill. */
const leaguePodium = (table: Standing[]) => ({
  first: table[0]?.playerId ?? null,
  second: table[1]?.playerId ?? null,
  third: table[2] ? [table[2].playerId] : [],
});

/** Fixtures as cards. No matchday headings: a club league is played whenever
 *  two people are free, so the round a fixture was generated in means nothing
 *  to anybody reading it. */
function Fixtures({
  matches,
  nameOf,
  index,
  recorder,
}: {
  matches: TournamentMatch[];
  nameOf: (id: number) => string;
  index: BracketIndex;
  recorder: (match: TournamentMatch) => (() => void) | null;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          nameOf={nameOf}
          index={index}
          onRecord={recorder(match) ?? undefined}
        />
      ))}
    </div>
  );
}
