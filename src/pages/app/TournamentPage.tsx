import { useMemo, useState } from "react";
import { dialogClasses } from "@/components/ui/cardStyles";
import {
  LuBanknote,
  LuGitFork,
  LuList,
  LuPlus,
  LuUserMinus,
  LuUserPlus,
} from "react-icons/lu";
import { runMutation } from "@/libs/browser/mutationToast";
import { useAuth } from "@/hooks/useAuth";
import { usePlayers, usePlayerLookup } from "@/hooks/usePlayers";
import { useGames } from "@/hooks/useGames";
import { useEloRanking } from "@/hooks/useEloRanking";
import { useTournament, useManageTournaments } from "@/hooks/useTournaments";
import {
  bracketIndex,
  eligibleToAdd,
  findOutstandingMatch,
  groupCount,
  raceFor,
  resolveBracket,
  seedEntrants,
  qualifyMarks,
  tournamentResults,
} from "@/libs/algorithms/bracket";
import { groupStandings } from "@/libs/algorithms/leagueTable";
import { eventDates, isUpcoming } from "@/libs/algorithms/eventDates";
import PageTitle from "@/components/layout/PageTitle";
import BracketView from "@/components/tournaments/BracketView";
import LeagueTable from "@/components/tournaments/LeagueTable";
import MatchList from "@/components/games/MatchList";
import LeagueFixtures, {
  Fixtures,
} from "@/components/tournaments/LeagueFixtures";
import TournamentPodium from "@/components/tournaments/TournamentPodium";
import { canEnterTournament } from "@/libs/algorithms/tournamentEntry";
import SocialBar from "@/components/social/SocialBar";
import TournamentAdminPanel from "@/components/tournaments/TournamentAdminPanel";
import PlayGameForm from "@/components/games/PlayGameForm";
import { PlayerHighlight } from "@/components/players/PlayerLink";
import { PlayerOptions } from "@/components/players/PlayerOptions";
import TournamentForm, {
  type TournamentValues,
} from "@/components/tournaments/TournamentForm";
import { Card, CardHeader, CollapsibleCard } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { CategoryBadge } from "@/components/ui/Ball";
import { Fact } from "@/components/ui/Fact";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDialog } from "@/hooks/useDialog";
import { FORMAT_KEY, tournamentValues, type TournamentMatch } from "@/types";
import { useT } from "@/i18n";
import { getRouteApi } from "@tanstack/react-router";
import { AppLink } from "@/components/layout/AppLink";
import { PlayerFlag } from "@/components/players/PlayerLink";

const route = getRouteApi("/app/_authed/$clubSlug/tournaments/$tournamentId");

export default function TournamentPage() {
  const { t, locale } = useT();
  const { tournamentId: tournamentIdParam } = route.useParams();
  const tournamentId = Number(tournamentIdParam);

  const { player, activeClubId, isClubAdmin, isMember } = useAuth();
  /** The reader, where they are a person: the club's tablet is a device and
   *  belongs in none of these lists — see PlayerOptions. */
  const meId = player?.is_device ? undefined : player?.id;
  const { data: tournament, isLoading } = useTournament(tournamentId);
  const { data: players } = usePlayers();
  const { byId, nameOf } = usePlayerLookup();
  const { data: games } = useGames({});
  const elo = useEloRanking({ games: games?.games, players });

  const {
    updateTournament,
    deleteTournament,
    joinTournament,
    leaveTournament,
    setPaid,
    startTournament,
    generateKnockout,
    recordResult,
    addLateEntrant,
    removeEntrant,
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

  const paidById = new Map(
    (tournament?.tournament_players ?? []).map((e) => [e.player_id, e.paid]),
  );

  const seeded = useMemo(
    () => seedEntrants(entrants, elo, nameOf),
    [entrants, elo, nameOf],
  );

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
            action={
              <AppLink
                to="/app/$clubSlug/tournaments"
                className={buttonClasses({ variant: "secondary" })}
              >
                {t("nav.tournaments")}
              </AppLink>
            }
          />
        </Card>
      </div>
    );
  }

  const groups = groupCount(tournament.advance ?? 2);
  const entered = player ? entrants.includes(player.id) : false;
  const canEnter = canEnterTournament(tournament.category, player?.category);

  /** Who the organiser can still put in: the club roster this tournament is
   *  open to, minus whoever is already entered. */
  const addable = eligibleToAdd(players ?? [], tournament.category, entrants);

  const { podium, table: leagueRows } = tournamentResults(
    tournament,
    entrants,
    matches,
  );

  const groupMatches = matches.filter((m) => m.bracket === "group");
  const groupsDone =
    groupMatches.length > 0 && groupMatches.every((m) => m.winner_id !== null);

  /** Anyone in the club can file a result, once both seats are filled. */
  const canPlay = isMember && tournament.status !== "done";
  const playable = (match: TournamentMatch) =>
    match.winner_id === null && match.p1_id !== null && match.p2_id !== null;

  const togglePaid = (playerId: number) =>
    runMutation(
      setPaid.mutateAsync({
        tournamentId,
        playerId,
        paid: !(paidById.get(playerId) ?? false),
      }),
      t,
      "common.saved",
    );

  const recorder = (match: TournamentMatch) =>
    canPlay && playable(match) ? () => setPlaying(match) : null;

  const pendingMatches = matches.filter((m) => m.winner_id === null);

  const findMatch = (a: number, b: number) =>
    findOutstandingMatch(matches, a, b);

  const entrantPlayers = (players ?? []).filter((p) => entrants.includes(p.id));

  /** The race this fixture runs to, from how deep in the draw it sits. */
  const raceOf = (match: TournamentMatch) =>
    raceFor(match, tournament, matches);

  const when = eventDates(tournament.starts_on, tournament.ends_on, locale);

  return (
    <PlayerHighlight>
      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        <PageTitle title={tournament.name}>
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

        {/* The terms of the thing, each one named.
            This was a run-on subtitle — "9-ball · League · Entries open" — and
            a page that told you none of what an entrant actually needs to know:
            when it runs, what it costs, what a match is played to. Every one of
            those was already on the row, unread. Same definition list the
            public page leads with, so a member and a visitor read the same
            facts in the same shape. */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-hairline py-4 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-4">
          {/* First, across the phone's whole width, and present even when
              empty: "when" is the question an open tournament is opened to
              answer, "nobody has said yet" is a real answer to it, and a date
              range is the one value here that will not share a narrow row
              without being cut in half. */}
          <Fact
            className="col-span-2 sm:col-span-1"
            label={t(
              isUpcoming(tournament.starts_on) && !tournament.ends_on
                ? "tournaments.startsOn"
                : "tournaments.dates",
            )}
          >
            {when ?? (
              <span className="text-ink-faint">
                {t("tournaments.notDated")}
              </span>
            )}
          </Fact>

          <Fact label={t("tournaments.statusLabel")}>
            {t(`tournaments.status.${tournament.status}`)}
          </Fact>
          <Fact label={t("tournaments.format")}>
            {t(`tournaments.${FORMAT_KEY[tournament.format]}`)}
          </Fact>
          <Fact label={t("tournaments.discipline")}>
            {t(`discipline.${tournament.discipline}`)}
          </Fact>
          <Fact label={t("tournaments.category")}>
            {tournament.category === null ? (
              t("tournaments.combined")
            ) : (
              <CategoryBadge category={tournament.category} />
            )}
          </Fact>

          {/* What a match is. The number carries its unit — a bare "7" under a
              label leaves the reader to guess whether it is racks, frames or
              minutes. The base race always; the deeper ones only where the
              organiser set them apart, since a flat draw would otherwise say
              the same number three times. */}
          <Fact label={t("tournaments.raceTo")}>
            {t("tournaments.raceN", { n: tournament.race_to })}
          </Fact>
          {!!tournament.race_semi && (
            <Fact label={t("tournaments.raceSemi")}>
              {t("tournaments.raceN", { n: tournament.race_semi })}
            </Fact>
          )}
          {!!tournament.race_final && (
            <Fact label={t("tournaments.raceFinal")}>
              {t("tournaments.raceN", { n: tournament.race_final })}
            </Fact>
          )}

          {/* Meaningless in a straight knockout, where a pair meets once by
              construction. */}
          {tournament.format !== "double_elim" && (
            <Fact label={t("tournaments.legs")}>
              {t(
                tournament.legs === 2
                  ? "tournaments.legs2"
                  : "tournaments.legs1",
              )}
            </Fact>
          )}
          {tournament.format === "group_knockout" &&
            tournament.advance !== null && (
              <Fact label={t("tournaments.advance")}>
                {t("tournaments.advanceN", { n: tournament.advance })}
              </Fact>
            )}

          {tournament.entry_fee && (
            <Fact
              className="col-span-2 sm:col-span-1"
              label={t("tournaments.entryFee")}
            >
              {tournament.entry_fee}
            </Fact>
          )}
        </dl>

        {/* Prizes and anything else the organiser wants entrants to read —
            long-form, so it sits below the fixed facts rather than fighting
            them for a grid cell. */}
        {tournament.notes && (
          <p className="whitespace-pre-wrap text-body text-ink">
            {tournament.notes}
          </p>
        )}

        {/* A finished tournament leads with its result: the bracket below is
            then the story of how it got there, not the headline. */}
        {tournament.status === "done" && podium && (
          <Card className="overflow-hidden">
            <CardHeader title={t("tournaments.results")} />
            <TournamentPodium places={podium} byId={byId} />
            {/* Same target as the feed card's bar, so it is one thread seen
                from two places rather than two threads. */}
            <div className="px-4 pb-3">
              <SocialBar target={{ tournamentId: tournament.id }} />
            </div>
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
                      runMutation(
                        entered
                          ? leaveTournament.mutateAsync({ tournamentId })
                          : joinTournament.mutateAsync({ tournamentId }),
                        t,
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
                  !canEnter && tournament.category
                    ? t("tournaments.notEligible", {
                        category: t(`category.${tournament.category}`),
                      })
                    : t("tournaments.noEntrantsHint")
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
                        <PlayerFlag playerId={playerId} />
                      </AppLink>
                      {playerId === player?.id && (
                        <span className="ml-2 text-caption text-ink-faint">
                          {t("club.you")}
                        </span>
                      )}
                    </span>
                    {/* Paid tracking only matters while entry is still being
                        collected — the toggle lives inside this same "open"
                        card rather than following the entrant into the draw —
                        and only for a tournament that actually charges one. */}
                    {tournament.requires_payment && (
                      <PaidMark
                        paid={paidById.get(playerId) ?? false}
                        canToggle={isClubAdmin}
                        pending={setPaid.isPending}
                        onToggle={() => togglePaid(playerId)}
                      />
                    )}
                    {isClubAdmin && (
                      <IconButton
                        label={t("tournaments.removeNamed", {
                          name: nameOf(playerId),
                        })}
                        size="sm"
                        tone="danger"
                        onClick={() =>
                          runMutation(
                            leaveTournament.mutateAsync({
                              tournamentId,
                              playerId,
                            }),
                            t,
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
                      <PlayerOptions players={addable} meId={meId} />
                    </Select>
                    <Button
                      size="sm"
                      className="shrink-0"
                      disabled={!adding || joinTournament.isPending}
                      onClick={() => {
                        const playerId = Number(adding);
                        setAdding("");
                        runMutation(
                          joinTournament.mutateAsync({
                            tournamentId,
                            playerId,
                          }),
                          t,
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
                qualify={qualifyMarks(tournament.status)}
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
              <LeagueTable
                title={t("tournaments.standings")}
                rows={leagueRows}
                matches={matches}
                nameOf={nameOf}
                categoryOf={
                  tournament.category === null
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
            {/* A league keeps its unpaid entrants rather than removing them at
                the start (see TournamentAdminPanel), so the tracker they were
                paid through has to survive the same move — this is that same
                toggle, just no longer confined to the "open" card, which
                disappears once the draw is cut. */}
            {tournament.requires_payment && (
              <CollapsibleCard
                defaultOpen={false}
                title={t("tournaments.paid")}
              >
                <ul className="divide-y divide-hairline">
                  {[...entrants]
                    .sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
                    .map((playerId) => (
                      <li
                        key={playerId}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <span className="min-w-0 flex-1 truncate text-body text-ink">
                          {nameOf(playerId)}
                          <PlayerFlag playerId={playerId} />
                        </span>
                        <PaidMark
                          paid={paidById.get(playerId) ?? false}
                          canToggle={isClubAdmin}
                          pending={setPaid.isPending}
                          onToggle={() => togglePaid(playerId)}
                        />
                      </li>
                    ))}
                </ul>
              </CollapsibleCard>
            )}
            {/* One card, because they are one question asked two ways: what
                has been played, and what is still owed. Folded, because a full
                round robin is dozens of cards and the table above them is what
                most people came for. */}
            <LeagueFixtures
              matches={matches}
              personOf={(id) => byId.get(id)}
              playerIds={seeded}
              meId={meId}
              emptyHint={canPlay ? t("tournaments.noGamesHint") : undefined}
            />
          </>
        )}

        {isClubAdmin && (
          // The seam between the tournament and the running of it. Everything
          // above is what a tournament is; everything below is a job, and only
          // one person on the page has it. Done still gets this seam: delete
          // is the one job left once a tournament is over.
          <div className="border-t border-hairline pt-4">
            <TournamentAdminPanel
              tournament={tournament}
              tournamentId={tournamentId}
              seeded={seeded}
              groupsDone={groupsDone}
              addable={addable}
              entered={entrantPlayers}
              meId={meId}
              manage={{
                startTournament,
                deleteTournament,
                generateKnockout,
                updateTournament,
                addLateEntrant,
                removeEntrant,
              }}
              onEdit={() => setIsEditOpen(true)}
            />
          </div>
        )}
      </div>

      <dialog
        ref={editRef}
        className={dialogClasses({ wide: true })}
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
            initialValues={tournamentValues(tournament)}
            // Once the fixtures exist they were generated from these
            // settings, so the form drops them and keeps the rest.
            locked={tournament.status !== "open"}
            isSubmitting={updateTournament.isPending}
            onCancel={() => setIsEditOpen(false)}
            onSubmit={(values: TournamentValues) => {
              setIsEditOpen(false);
              runMutation(
                updateTournament.mutateAsync({ id: tournamentId, ...values }),
                t,
                "common.saved",
              );
            }}
          />
        )}
      </dialog>

      <dialog
        ref={recordRef}
        className={dialogClasses()}
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
            meId={meId}
            initialMatch={playing === "new" ? null : playing}
            findMatch={findMatch}
            raceFor={raceOf}
            isSubmitting={recordResult.isPending}
            onCancel={() => setPlaying(null)}
            onSubmit={(values) => {
              setPlaying(null);
              runMutation(
                recordResult.mutateAsync({
                  ...values,
                  discipline: tournament.discipline,
                }),
                t,
                "tournaments.recorded",
              );
            }}
          />
        )}
      </dialog>
    </PlayerHighlight>
  );
}

/** Whether an entrant has paid: a toggle for the club's admin, a mark for
 *  everyone else — and nothing at all for an unpaid entrant, whose absence of
 *  a mark says it. */
function PaidMark({
  paid,
  canToggle,
  pending,
  onToggle,
}: {
  paid: boolean;
  canToggle: boolean;
  pending: boolean;
  onToggle: () => void;
}) {
  const { t } = useT();
  if (canToggle)
    return (
      <IconButton
        label={t("tournaments.paid")}
        title={t("tournaments.paid")}
        size="sm"
        disabled={pending}
        onClick={onToggle}
        shape="circle"
        className={
          paid
            ? "bg-strike text-pocket hover:bg-strike-light"
            : "text-ink-faint"
        }
      >
        <LuBanknote className="h-4 w-4" aria-hidden />
      </IconButton>
    );
  if (!paid) return null;
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-strike text-pocket"
      aria-label={t("tournaments.paid")}
      title={t("tournaments.paid")}
    >
      <LuBanknote className="h-4 w-4" aria-hidden />
    </span>
  );
}
