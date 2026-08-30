import { useState } from "react";
import { LuMinus, LuPlus } from "react-icons/lu";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
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

  // An admin is a player and belongs in their own list; the device is not one.
  // Sorted in with everybody else rather than pinned to the top: whoever is in
  // the room is a better guess than whoever is holding the phone, and a name at
  // the head of a list reads as the answer.
  const sideOne = isDevice ? roster : [...roster, me].sort(byPresenceThenName);

  const opponent =
    lockedOpponent ?? roster.find((p) => String(p.id) === opponentId);
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
    Number.isInteger(race) &&
    race >= 1 &&
    race <= 50;

  const where = table
    ? t("live.onTable", { name: table.label })
    : tables?.length
      ? t("live.pickTable")
      : t("live.noFreeTables");

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
          discipline,
          raceTo: race,
          // A match with no table is a real thing in a busy club, and it is
          // what "every table is taken but we are playing anyway" writes.
          tableId: table?.id ?? (tableId ? Number(tableId) : null),
        });
      }}
    >
      <div>
        <h2 className="text-h3 font-semibold text-ink">{t("live.start")}</h2>
        <p className="text-caption text-ink-faint">{where}</p>
      </div>

      {/* What the match is, before who is in it. Format decides whether there
          are two seats or four, so asking it after the players is asking them
          to fill in a form that changes shape underneath them. */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-card border border-hairline bg-felt-raised p-3">
        <div className="space-y-1.5">
          <Label>{t("live.format")}</Label>
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
          <Label>{t("live.discipline")}</Label>
          <Segmented
            value={discipline}
            onChange={setDiscipline}
            label={t("live.discipline")}
            options={DISCIPLINES.map((d) => ({
              value: d,
              label: t(`discipline.${d}`),
            }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="live-race">{t("live.race")}</Label>
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
              disabled={isSubmitting || race <= 1}
              className="h-11 w-11 px-0"
            >
              <LuMinus className="h-4 w-4" aria-hidden />
            </Button>
            <Input
              id="live-race"
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              value={raceTo}
              onChange={(e) => setRaceTo(e.target.value)}
              className="h-11 w-16 text-center font-mono"
              disabled={isSubmitting}
              required
            />
            <Button
              type="button"
              variant="secondary"
              aria-label={t("live.raceUp")}
              onClick={() => stepRace(1)}
              disabled={isSubmitting || race >= 50}
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
              {sideOne.map((p) => (
                <option key={p.id} value={p.id}>
                  {label(p)}
                </option>
              ))}
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
              {roster.map((p) => (
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

      {duplicate && (
        <p className="text-caption text-strike">{t("games.duplicatePlayer")}</p>
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
