import { useState } from "react";
import { toast } from "react-toastify";
import { LuMinus, LuPlus, LuTv } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useGetGames } from "@/hooks/useGetGames";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useClubTables } from "@/hooks/useClubTables";
import { useLiveMatches, useManageLiveMatch } from "@/hooks/useLiveMatch";
import { useCheckIn, useWhoIsHere } from "@/hooks/useNight";
import { seatsOf, sideNames } from "@/libs/night";
import StartMatchForm from "@/components/live/StartMatchForm";
import PageTitle from "@/components/layout/PageTitle";
import { AppLink } from "@/components/layout/AppLink";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Segmented } from "@/components/ui/Segmented";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { dialogClasses } from "@/components/ui/cardStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useDialog } from "@/libs/useDialog";
import { readTodaySetup, writeTodaySetup } from "@/libs/prefs";
import {
  balanceDoubles,
  clampRace,
  pairKey,
  seatsNeeded,
  suggestGroups,
  type DaySetup,
} from "@/libs/today";
import { liveWriteMessage } from "@/libs/dbError";
import { useNow } from "@/libs/useNow";
import { useT } from "@/i18n";
import { DISCIPLINES, type ClubTable, type Player } from "@/types";

/**
 * The club night, on one page.
 *
 * It used to be two: a grid of tables, and a board by the door for checking in.
 * They were never read apart — you arrive, you tap your face, you look for a
 * free table — and neither of them alone could answer the question the room
 * actually asks, which is "who is here and not playing".
 *
 * Top to bottom in the order the night is thought about: what we are playing,
 * what is on the tables, who could be on one, who is here.
 */
export default function TodayPage() {
  const { t } = useT();
  const { player, isClubAdmin } = useAuth();
  const { data: players, isLoading } = useGetPlayers();
  const { data: tables } = useClubTables();
  const { data: live } = useLiveMatches();
  const { startMatch } = useManageLiveMatch();
  const checkIn = useCheckIn();
  const here = useWhoIsHere();
  // Today's filed results, for who has already had a table. Null until the
  // browser knows the date — see libs/useNow.
  const now = useNow();
  const today = now === null ? null : new Date(now).toLocaleDateString("sv-SE");
  const { data: gamesToday } = useGetGames({ date: today ?? undefined });

  // From the cookie, so the server renders the bar the club left it on — see
  // libs/today.ts.
  const [setup, setSetup] = useState<DaySetup>(readTodaySetup);
  const change = (part: Partial<DaySetup>) => {
    const next = { ...setup, ...part };
    setSetup(next);
    writeTodaySetup(next);
  };

  const [startingOn, setStartingOn] = useState<ClubTable | null>(null);
  const dialogRef = useDialog(startingOn !== null);
  const close = () => setStartingOn(null);

  const roster = players ?? [];
  const matchOn = (tableId: number) =>
    (live ?? []).find((m) => m.table_id === tableId);
  const hereIds = new Set(here.map((p) => p.id));
  const canCheckOthers = isClubAdmin || player?.is_device === true;

  // All four seats, so a doubles partner is not offered a table of their own.
  const busy = new Set((live ?? []).flatMap(seatsOf));
  const seats = seatsNeeded(setup);
  const freeTables = (tables ?? []).filter((tbl) => !matchOn(tbl.id));

  // Today's results, twice over: how many each person has had, and who has
  // already been on a table with whom. The first orders the waiting list, the
  // second keeps it from pairing the same two again.
  const playedToday = new Map<number, number>();
  const metToday = new Set<string>();

  for (const game of gamesToday?.games ?? []) {
    const ids = [
      game.player_1_id,
      game.player_2_id,
      game.player_1b_id,
      game.player_2b_id,
    ].filter((id): id is number => id !== null);

    for (const id of ids) playedToday.set(id, (playedToday.get(id) ?? 0) + 1);
    // Partners as well as opponents: they have had their game together either
    // way, and in doubles a repeated partner is as stale as a repeated
    // opponent.
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++)
        metToday.add(pairKey(ids[i], ids[j]));
  }

  /**
   * Here, and not at a table.
   *
   * Fewest games today first, then longest checked in. Whoever has been sitting
   * with a drink all evening is the answer to "who should have this table", and
   * the person who has just filed their third is not — but it is a sort and not
   * a filter: by ten o'clock everybody has played, and a suggestion nobody is
   * offered is worse than one that repeats a pairing.
   *
   * Arriving is the whole of the queue this replaced, which is the point: it is
   * the one thing everybody does anyway.
   *
   * The club's own tablet checks in as a device and is not a player, so it never
   * turns up in a suggestion.
   */
  const idle = here
    .filter((p) => !busy.has(p.id) && p.is_device !== true)
    .sort(
      (a, b) =>
        (playedToday.get(a.id) ?? 0) - (playedToday.get(b.id) ?? 0) ||
        (a.present_since ?? "").localeCompare(b.present_since ?? ""),
    );

  // As many matches as there are tables to put them on, and no more: asking for
  // what is wanted is what keeps a suggestion still while somebody checks in at
  // the door. One is asked for when every table is busy, so "you two are next"
  // is still said. Whole matches only — three people waiting for doubles is not
  // a suggestion, it is three people waiting.
  //
  // Balanced as they are formed, so the names shown and the match started are
  // the same match: the queue decides which four are together, the divisions
  // decide who plays with whom — see suggestGroups and balanceDoubles in
  // libs/today.ts.
  const suggestions = suggestGroups(
    idle,
    seats,
    (a, b) => metToday.has(pairKey(a, b)),
    Math.max(freeTables.length, 1),
  ).map((group) => (seats === 4 ? balanceDoubles(group) : group));

  /** Mirrors can_score_live_match in sql/live-night.sql: the insert is refused
   *  for anyone who is neither in the match nor the club's admin or tablet, so
   *  the button is not offered rather than offered and failing. */
  const canStart = (group: Player[]) =>
    isClubAdmin ||
    player?.is_device === true ||
    group.some((p) => p.id === player?.id);

  const startSuggested = (group: Player[], table: ClubTable) =>
    startMatch.mutate(
      {
        // Side one is the first two, side two the last two — the order
        // balanceDoubles put them in.
        player1: group[0],
        partner1: group[1] && seats === 4 ? group[1] : null,
        player2: seats === 4 ? group[2] : group[1],
        partner2: seats === 4 ? group[3] : null,
        tableId: table.id,
        discipline: setup.discipline,
        raceTo: setup.raceTo,
      },
      {
        onError: (err) => toast.error(t(liveWriteMessage(err, "startMatch"))),
      },
    );

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-3 py-4">
      <PageTitle title={t("nav.today")}>
        {/* The wall display is a URL somebody types once on a device that then
            never navigates again — but it has to be findable the first time. */}
        <AppLink
          to="/app/$clubSlug/tv"
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          <LuTv className="h-4 w-4" aria-hidden />
          {t("tv.open")}
        </AppLink>
      </PageTitle>

      {/* What the club is playing. One answer for the room rather than the same
          three questions on every match — the start form still opens with these
          and can still be argued with per match. */}
      <section className="space-y-2">
        <p className="px-1 text-caption text-ink-faint">{t("today.setup")}</p>
        <Card className="flex flex-wrap items-end gap-x-4 gap-y-3 p-3">
          <div className="space-y-1.5">
            <Label>{t("live.format")}</Label>
            <Segmented
              value={setup.mode}
              onChange={(mode) => change({ mode })}
              label={t("live.format")}
              options={[
                { value: "single", label: t("games.single") },
                { value: "doubles", label: t("games.doubles") },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("live.discipline")}</Label>
            <Segmented
              value={setup.discipline}
              onChange={(discipline) => change({ discipline })}
              label={t("live.discipline")}
              options={DISCIPLINES.map((d) => ({
                value: d,
                label: t(`discipline.${d}`),
              }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("live.race")}</Label>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="secondary"
                aria-label={t("live.raceDown")}
                onClick={() => change({ raceTo: clampRace(setup.raceTo - 1) })}
                disabled={setup.raceTo <= 1}
                className="h-11 w-11 px-0"
              >
                <LuMinus className="h-4 w-4" aria-hidden />
              </Button>
              <span className="w-10 text-center font-mono text-h4 tabular-nums text-ink">
                {setup.raceTo}
              </span>
              <Button
                type="button"
                variant="secondary"
                aria-label={t("live.raceUp")}
                onClick={() => change({ raceTo: clampRace(setup.raceTo + 1) })}
                disabled={setup.raceTo >= 50}
                className="h-11 w-11 px-0"
              >
                <LuPlus className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* The tables, first: it is the question anybody walking in asks. */}
      <section className="space-y-3">
        <h2 className="px-1 text-h4 font-semibold text-ink">
          {t("tables.title")}
        </h2>

        {isLoading ? (
          <SkeletonRows />
        ) : (tables ?? []).length === 0 ? (
          <EmptyState
            title={t("tables.emptyTitle")}
            hint={
              isClubAdmin ? t("tables.emptyAdminHint") : t("tables.emptyHint")
            }
            action={
              isClubAdmin && (
                <AppLink to="/app/$clubSlug/club">
                  <Button>{t("tables.manage")}</Button>
                </AppLink>
              )
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(tables ?? []).map((table) => {
              const match = matchOn(table.id);

              return (
                <Card key={table.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <AppLink
                      to="/app/$clubSlug/tables/$tableId"
                      params={{ tableId: String(table.id) }}
                      className="min-w-0 truncate text-h4 font-semibold text-ink hover:text-strike"
                    >
                      {t("tables.named", { name: table.label })}
                    </AppLink>
                    {match ? (
                      <span className="flex items-center gap-1.5 text-caption text-strike">
                        <span className="live-dot h-1.5 w-1.5 rounded-full bg-strike" />
                        {t("live.now")}
                      </span>
                    ) : (
                      <span className="text-caption text-ink-faint">
                        {t("tables.free")}
                      </span>
                    )}
                  </div>

                  {match ? (
                    <AppLink
                      to="/app/$clubSlug/live/$liveId"
                      params={{ liveId: match.id }}
                      className="mt-3 block"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 flex-1 truncate text-body text-ink">
                          {sideNames(match, 1, roster)}
                        </span>
                        <span className="font-mono text-h4 font-semibold text-ink tabular-nums">
                          {match.player_1_score} – {match.player_2_score}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-right text-body text-ink">
                          {sideNames(match, 2, roster)}
                        </span>
                      </div>
                      <p className="mt-1 text-caption text-ink-faint">
                        {t("live.raceTo", { n: match.race_to })}
                      </p>
                    </AppLink>
                  ) : (
                    <Button
                      className="mt-3 w-full"
                      variant="secondary"
                      onClick={() => setStartingOn(table)}
                    >
                      {t("live.playHere")}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Who could be playing. The whole of the old waiting list, without
          anybody having to join one: being here and not at a table is the only
          state it ever meant. */}
      {suggestions.length > 0 && (
        <section className="space-y-3">
          <h2 className="px-1 text-h4 font-semibold text-ink">
            {t("today.suggested")}
          </h2>

          <div className="space-y-2">
            {suggestions.map((group, i) => {
              const table = freeTables[i];

              return (
                <Card
                  key={group.map((p) => p.id).join("-")}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex shrink-0 -space-x-2">
                      {group.map((p) => (
                        <Avatar
                          key={p.id}
                          name={p.name}
                          url={p.avatar_url}
                          className="h-9 w-9 ring-2 ring-felt"
                        />
                      ))}
                    </div>
                    <span className="min-w-0 truncate text-body text-ink">
                      {seats === 4
                        ? `${group[0].name} & ${group[1].name} — ${group[2].name} & ${group[3].name}`
                        : `${group[0].name} — ${group[1].name}`}
                    </span>
                  </div>

                  {table ? (
                    <Button
                      disabled={!canStart(group) || startMatch.isPending}
                      onClick={() => startSuggested(group, table)}
                    >
                      {t("today.startOn", { name: table.label })}
                    </Button>
                  ) : (
                    <span className="text-caption text-ink-faint">
                      {t("today.noFreeTable")}
                    </span>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* The board by the door, at the bottom: you tap your face once on the way
          in and never look at it again. Faces rather than a list, because it is
          read by somebody with a cue bag on their shoulder and the point is
          recognising yourself rather than reading a name.
          On a phone only your own tap does anything — checking somebody else in
          is refused by the guard in sql/live-night.sql. */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h2 className="text-h4 font-semibold text-ink">
            {t("tonight.heading")}
          </h2>
          <span className="text-caption tabular-nums text-ink-faint">
            {t("tonight.count", { n: here.length })}
          </span>
        </div>

        {isLoading ? (
          <SkeletonRows rows={4} />
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {roster.map((p) => {
              const isHere = hereIds.has(p.id);
              const mine = p.id === player?.id;
              const can = mine || canCheckOthers;

              return (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={!can || checkIn.isPending}
                    aria-pressed={isHere}
                    onClick={() =>
                      checkIn.mutate(
                        { here: !isHere, playerId: p.id },
                        { onError: () => toast.error(t("common.error")) },
                      )
                    }
                    className={[
                      "flex w-full flex-col items-center gap-2 rounded-card border p-3",
                      "transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out)]",
                      can ? "active:scale-[0.97]" : "cursor-default",
                      // Present is a filled state, not a badge on a face: the
                      // board is read as "which of these are lit".
                      isHere
                        ? "border-strike/60 bg-felt-raised"
                        : "border-hairline opacity-60 hover:opacity-100",
                    ].join(" ")}
                  >
                    {/* No seed: a face without a picture is a grey disc rather
                        than a solid ball colour. Forty of them in the club's own
                        accent is a board that reads as forty buttons — what is
                        being asked here is which of these are lit, and that is
                        the border and the fill saying it. */}
                    <Avatar
                      name={p.name}
                      url={p.avatar_url}
                      className="h-12 w-12"
                    />
                    <span className="w-full truncate text-center text-caption text-ink">
                      {p.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {!canCheckOthers && (
          <p className="px-1 text-caption text-ink-faint">
            {t("tonight.onlyYou")}
          </p>
        )}
      </section>

      <dialog
        ref={dialogRef}
        className={dialogClasses({ wide: true })}
        aria-label={t("live.start")}
        onClose={close}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        {startingOn && player && (
          <StartMatchForm
            me={player}
            opponents={roster.filter((p) => p.id !== player.id)}
            table={startingOn}
            // The day's answer, already filled in. Still a form: one match in an
            // evening is somebody's race to nine and it should not need the bar
            // above changing and changing back.
            defaults={setup}
            onSubmit={(values) =>
              startMatch.mutate(
                {
                  player1: values.player1,
                  player2: values.player2,
                  partner1: values.partner1,
                  partner2: values.partner2,
                  tableId: values.tableId,
                  discipline: values.discipline,
                  raceTo: values.raceTo,
                },
                {
                  // Stay here. Starting a match from the room's list is often
                  // starting somebody else's — the card behind the dialog turns
                  // live on its own, which is the confirmation.
                  onSuccess: close,
                  onError: (err) =>
                    toast.error(t(liveWriteMessage(err, "startMatch"))),
                },
              )
            }
            onCancel={close}
            isSubmitting={startMatch.isPending}
          />
        )}
      </dialog>
    </div>
  );
}
