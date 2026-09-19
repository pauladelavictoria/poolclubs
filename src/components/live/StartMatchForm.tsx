import { useState } from "react";
import { LuMinus, LuPlus } from "react-icons/lu";
import { Select } from "@/components/ui/Select";
import { PlayerOptions } from "@/components/players/PlayerOptions";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Toggle } from "@/components/ui/Toggle";
import {
  DISCIPLINES,
  type ClubTable,
  type Discipline,
  type GameMode,
  type Player,
} from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useWhoIsHere } from "@/hooks/useNight";
import { DEFAULT_SETUP, type DaySetup } from "@/libs/algorithms/today";
import type { LeagueFixture } from "@/queries/tournaments";
import { useT } from "@/i18n";

/**
 * Who you are playing, where, and what you are playing to.
 *
 * You are always one side of it — a member starts their own match, and the
 * database says so too (the INSERT policy wants a seat, or the club's own
 * device). Filing someone else's result is what /games/new is for.
 *
 * Two ways in, and they differ only in what is already decided. From a table,
 * the table is fixed and the opponent is the question. From an accepted
 * challenge it is the other way round, so the opponent is locked and the free
 * tables are offered. Neither is a separate form.
 */
export default function StartMatchForm({
  me,
  opponents,
  roster: rosterProp,
  lockedOpponent,
  table,
  tables,
  streamed = false,
  leagueFixtures,
  onSubmit,
  onCancel,
  isSubmitting,
  defaults = DEFAULT_SETUP,
}: {
  me: Player;
  /** Ignored when `lockedOpponent` is given. */
  opponents: Player[];
  /** Everyone in the club, for picking partners. Defaults to `opponents`. */
  roster?: Player[];
  lockedOpponent?: Player;
  /** Already decided — started from that table. */
  table?: ClubTable;
  /** Offer a choice of these. Free tables only; the caller knows which. */
  tables?: ClubTable[];
  /** Every pending fixture of a running league in the club. Singles picked
   *  who happen to match one are offered the fixture's own race and
   *  discipline, and a live match tagged with it — see useLeagueFixtures. */
  leagueFixtures?: LeagueFixture[];
  /** Whether `table` has a camera — docs/youtube-streaming.md §2.5. Only
   *  meaningful together with `table`: a locked-opponent start (an accepted
   *  challenge, picked up from a phone rather than the table's own tablet)
   *  has no fixed table yet, so there is nothing to offer a camera for. */
  streamed?: boolean;
  /** What the club is playing today — see libs/algorithms/today.ts. The form opens on
   *  these rather than on its own defaults, and they stay changeable: one match
   *  in an evening is a race to nine and should not need the day's setting
   *  changed and changed back. */
  defaults?: DaySetup;
  onSubmit: (values: {
    /** Every seat, named. It used to yield only the opponent and let the caller
     *  put the signed-in player on the other side — which is right on a phone
     *  and wrong on the tablet, where the signed-in player is the club's device
     *  and would have been filed as one of the players. */
    player1: Player;
    player2: Player;
    /** Both or neither — doubles is four seats or it is not doubles. */
    partner1: Player | null;
    partner2: Player | null;
    discipline: Discipline;
    raceTo: number;
    tableId: number | null;
    recordOptIn: boolean;
    recordPrivacy: "public" | "unlisted" | null;
    /** Set when this pair also has a pending league fixture and the toggle
     *  below was left on — finishing then files the fixture too. */
    tournamentMatchId?: string;
  }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const { t } = useT();
  const { isClubAdmin } = useAuth();
  const here = useWhoIsHere();
  const hereIds = new Set(here.map((p) => p.id));

  // Whoever is in the room is the likely answer, so they sort to the top — but
  // nobody is kept out of a match for having forgotten to check in. Name order
  // within each group, which is the order the roster arrives in (see
  // queries/players.ts) and the order a list of people is read in.
  const byPresenceThenName = (a: Player, b: Player) =>
    Number(hereIds.has(b.id)) - Number(hereIds.has(a.id)) ||
    a.name.localeCompare(b.name);

  const roster = (rosterProp ?? opponents)
    .filter((p) => p.id !== me.id)
    .sort(byPresenceThenName);

  // Who may put two other people in a match.
  //
  // Mirrors can_score_live_match in sql/schema.sql: the club's admin, the
  // club's tablet, or somebody who is one of the seats. Any other member
  // picking two other names would have the insert refused, which is not a
  // choice worth offering.
  const isDevice = me.is_device === true;
  const forOthers = isDevice || isClubAdmin;

  /** An <option> cannot be styled, so presence is a mark in the text. */
  const label = (p: Player) =>
    hereIds.has(p.id) ? `\u25CF ${p.name}` : p.name;
  const [opponentId, setOpponentId] = useState("");
  const [mode, setMode] = useState<GameMode>(defaults.mode);
  const [partner1Id, setPartner1Id] = useState("");
  const [partner2Id, setPartner2Id] = useState("");
  const [tableId, setTableId] = useState(String(tables?.[0]?.id ?? ""));
  // Nobody, where the side is a question at all: an admin is as often starting
  // somebody else's match as their own, and a name already in the box is one
  // that gets left there.
  const [player1Id, setPlayer1Id] = useState(forOthers ? "" : String(me.id));
  const [discipline, setDiscipline] = useState<Discipline>(defaults.discipline);
  const [raceTo, setRaceTo] = useState(String(defaults.raceTo));
  // Off by default, per §2.5 — a casual game has given no prior consent to
  // being recorded, unlike a tournament fixture agreed at registration.
  const [recordOptIn, setRecordOptIn] = useState(false);
  const [recordPrivacy, setRecordPrivacy] = useState<"public" | "unlisted">(
    "unlisted",
  );
  // Which matched fixture the toggle below was turned back off for — not a
  // plain boolean, so switching opponents clears a stale "off" the same way
  // it clears a stale match: the id it was set for no longer applies.
  const [declinedFixtureId, setDeclinedFixtureId] = useState<string | null>(
    null,
  );

  // An admin is a player and belongs in their own list; the device is not one.
  // Sorted in with everybody else rather than pinned to the top: whoever is in
  // the room is a better guess than whoever is holding the phone, and a name at
  // the head of a list reads as the answer.
  const sideOne = isDevice ? roster : [...roster, me].sort(byPresenceThenName);

  // Matched against the same list the select for side two renders — whoever
  // can be side one can be side two, `sideOne` for both despite the name.
  const opponent =
    lockedOpponent ??
    (forOthers ? sideOne : roster).find((p) => String(p.id) === opponentId);
  const player1 = forOthers
    ? (sideOne.find((p) => String(p.id) === player1Id) ?? null)
    : me;

  // Partners come from the whole roster, not `opponents` — the locked-opponent
  // case narrows that list to nobody.
  const pool = lockedOpponent ? roster : opponents;
  const partner1 =
    mode === "doubles"
      ? (pool.find((p) => String(p.id) === partner1Id) ?? null)
      : null;
  const partner2 =
    mode === "doubles"
      ? (pool.find((p) => String(p.id) === partner2Id) ?? null)
      : null;

  // Singles only — a league fixture has no partner seats to match against.
  const fixture =
    mode === "single" && player1 && opponent
      ? leagueFixtures?.find(
          (f) =>
            (f.p1_id === player1!.id && f.p2_id === opponent.id) ||
            (f.p1_id === opponent.id && f.p2_id === player1!.id),
        )
      : undefined;
  const forLeague = !!fixture && fixture.id !== declinedFixtureId;
  // The fixture's own terms while it is in play — a league match is not
  // somebody's to shorten because the stepper is right there.
  const effectiveDiscipline = forLeague ? fixture!.tournament.discipline : discipline;
  const effectiveRaceTo = forLeague ? fixture!.tournament.race_to : Number(raceTo);

  const race = Number(raceTo);
  /** Clamped here rather than left to the input's min/max, which only the
   *  spinner and the browser's own validation honour. */
  const stepRace = (by: number) =>
    setRaceTo(String(Math.min(50, Math.max(1, (race || 5) + by))));
  // Nobody plays twice. The database has no opinion on the b-seats colliding,
  // so this is the only thing that stops a doubles match where one person is
  // three of the four players.
  const seats = [player1?.id, opponent?.id, partner1?.id, partner2?.id].filter(
    (id): id is number => id !== undefined && id !== null,
  );
  const duplicate = new Set(seats).size !== seats.length;
  const pairsReady = mode === "single" || (!!partner1 && !!partner2);

  const valid =
    !!player1 &&
    !!opponent &&
    pairsReady &&
    !duplicate &&
    Number.isInteger(effectiveRaceTo) &&
    effectiveRaceTo >= 1 &&
    effectiveRaceTo <= 50;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit({
          player1: player1!,
          player2: opponent!,
          partner1,
          partner2,
          discipline: effectiveDiscipline,
          raceTo: effectiveRaceTo,
          // A match with no table is a real thing in a busy club, and it is
          // what "every table is taken but we are playing anyway" writes.
          tableId: table?.id ?? (tableId ? Number(tableId) : null),
          recordOptIn: streamed && recordOptIn,
          recordPrivacy: streamed && recordOptIn ? recordPrivacy : null,
          tournamentMatchId: forLeague ? fixture!.id : undefined,
        });
      }}
    >
      <h2 className="text-h3 font-semibold text-ink">{t("live.start")}</h2>

      {/* What the match is, before who is in it. Format decides whether there
          are two seats or four, so asking it after the players is asking them
          to fill in a form that changes shape underneath them. */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-card border border-hairline bg-felt-raised p-3">
        <div className="space-y-1.5">
          <Segmented
            value={mode}
            onChange={setMode}
            label={t("live.format")}
            options={[
              { value: "single", label: t("games.single") },
              { value: "doubles", label: t("games.doubles") },
            ]}
          />
        </div>

        <div className="space-y-1.5">
          <Segmented
            value={effectiveDiscipline}
            onChange={setDiscipline}
            label={t("live.discipline")}
            disabled={forLeague}
            options={DISCIPLINES.map((d) => ({
              value: d,
              label: t(`discipline.${d}`),
            }))}
          />
        </div>

        <div className="space-y-1.5">
          {/* The tablet on the rail is the one that sets this up, and it has no
              keyboard worth opening for a number under fifty — the native
              spinner being two arrows a few pixels tall. The field stays
              typeable; the buttons are the fast path, not the only one. */}
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="secondary"
              aria-label={t("live.raceDown")}
              onClick={() => stepRace(-1)}
              disabled={isSubmitting || forLeague || race <= 1}
              className="h-11 w-11 px-0"
            >
              <LuMinus className="h-4 w-4" aria-hidden />
            </Button>
            <Input
              id="live-race"
              aria-label={t("live.race")}
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              value={effectiveRaceTo}
              onChange={(e) => setRaceTo(e.target.value)}
              className="h-11 w-16 text-center font-mono"
              disabled={isSubmitting || forLeague}
              required
            />
            <Button
              type="button"
              variant="secondary"
              aria-label={t("live.raceUp")}
              onClick={() => stepRace(1)}
              disabled={isSubmitting || forLeague || race >= 50}
              className="h-11 w-11 px-0"
            >
              <LuPlus className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        {tables && tables.length > 0 && (
          <div className="min-w-[8rem] flex-1 space-y-1.5">
            <Label htmlFor="live-table">{t("live.table")}</Label>
            <Select
              id="live-table"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              disabled={isSubmitting}
            >
              {tables.map((tbl) => (
                <option key={tbl.id} value={tbl.id}>
                  {tbl.label}
                </option>
              ))}
              <option value="">{t("live.noTable")}</option>
            </Select>
          </div>
        )}
      </div>

      {/* Then who is on each side, laid out as the two sides — so a doubles
          match is read down a column the way it will be read on the
          scoreboard, rather than as four selects in a list. */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2 rounded-card border border-hairline p-3">
          <p className="text-caption font-medium uppercase tracking-wide text-ink-faint">
            {forOthers ? t("live.sideOne") : t("live.you")}
          </p>
          {forOthers ? (
            <Select
              aria-label={t("live.sideOne")}
              value={player1Id}
              onChange={(e) => setPlayer1Id(e.target.value)}
              disabled={isSubmitting}
              required
            >
              <option value="">{t("common.select")}</option>
              {/* An admin starting a match is usually in it, so their own
                  name leads this side. Not on the tablet: `sideOne` already
                  leaves the device out, and `isDevice` keeps it out of the
                  mark too. */}
              <PlayerOptions
                players={sideOne}
                meId={isDevice ? undefined : me.id}
                format={label}
              />
            </Select>
          ) : (
            <p className="truncate text-body font-medium text-ink">{me.name}</p>
          )}

          {mode === "doubles" && (
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="live-partner1">{t("live.partner")}</Label>
              <Select
                id="live-partner1"
                value={partner1Id}
                onChange={(e) => setPartner1Id(e.target.value)}
                disabled={isSubmitting}
                required
              >
                <option value="">{t("common.select")}</option>
                {roster.map((p) => (
                  <option key={p.id} value={p.id}>
                    {label(p)}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-card border border-hairline p-3">
          <p className="text-caption font-medium uppercase tracking-wide text-ink-faint">
            {forOthers ? t("live.sideTwo") : t("live.opponent")}
          </p>

          {lockedOpponent ? (
            <p className="truncate text-body font-medium text-ink">
              {lockedOpponent.name}
            </p>
          ) : (
            <Select
              aria-label={t("live.opponent")}
              value={opponentId}
              onChange={(e) => setOpponentId(e.target.value)}
              disabled={isSubmitting}
              required
            >
              <option value="">{t("common.select")}</option>
              {/* Whoever can be side one can be side two — an admin or the
                  device is as often filing their own match as somebody
                  else's, and "you" only ever showing up on the left would
                  leave you unable to play as the opponent. */}
              {(forOthers ? sideOne : roster).map((p) => (
                <option key={p.id} value={p.id}>
                  {label(p)}
                </option>
              ))}
            </Select>
          )}

          {mode === "doubles" && (
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="live-partner2">{t("live.partner")}</Label>
              <Select
                id="live-partner2"
                value={partner2Id}
                onChange={(e) => setPartner2Id(e.target.value)}
                disabled={isSubmitting}
                required
              >
                <option value="">{t("common.select")}</option>
                {roster.map((p) => (
                  <option key={p.id} value={p.id}>
                    {label(p)}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Surfaces once the two names picked above also happen to be a pending
          league fixture — on by default, since that is why the tablet knows
          their race and discipline at all. Turning it off plays the same two
          people as a normal casual game instead. */}
      {fixture && (
        <div className="rounded-card border border-hairline p-3">
          <Toggle
            checked={forLeague}
            onChange={(checked) =>
              setDeclinedFixtureId(checked ? null : fixture.id)
            }
            label={t("live.forLeague", { name: fixture.tournament.name })}
            disabled={isSubmitting}
          />
        </div>
      )}

      {duplicate && (
        <p className="text-caption text-strike">{t("games.duplicatePlayer")}</p>
      )}

      {/* Casual games only, and only on a table with a camera — a tournament
          fixture is always recorded already (agreed once at registration),
          and a table with no club_streams row has nothing to record onto.
          See docs/youtube-streaming.md §2.5. */}
      {streamed && (
        <div className="space-y-2 rounded-card border border-hairline p-3">
          <Toggle
            checked={recordOptIn}
            onChange={setRecordOptIn}
            label={t("live.recordGame")}
            hint={t("live.recordGameHint")}
            disabled={isSubmitting}
          />
          {recordOptIn && (
            <Segmented
              value={recordPrivacy}
              onChange={setRecordPrivacy}
              label={t("live.recordPrivacy")}
              options={[
                { value: "unlisted", label: t("live.recordUnlisted") },
                { value: "public", label: t("live.recordPublic") },
              ]}
            />
          )}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={!valid || isSubmitting}>
          {isSubmitting ? t("common.saving") : t("live.start")}
        </Button>
      </div>
    </form>
  );
}
