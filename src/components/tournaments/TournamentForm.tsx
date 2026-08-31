import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { DisciplineBall } from "@/components/ui/Ball";
import { groupCount, minimumEntrants } from "@/libs/algorithms/bracket";
import {
  DISCIPLINES,
  type Category,
  type Discipline,
  type TournamentFormat,
} from "@/types";
import { useT } from "@/i18n";

export type TournamentValues = {
  name: string;
  /** ISO days, as the `date` columns store them. Both null for a tournament
   *  nobody has dated yet, which is most of them while entries are open. */
  starts_on: string | null;
  ends_on: string | null;
  /** What it costs to enter, in the organiser's own words. */
  entry_fee: string | null;
  format: TournamentFormat;
  category: Category | null;
  legs: 1 | 2;
  advance: number | null;
  single_from: number;
  discipline: Discipline;
  race_to: number;
  race_semi: number | null;
  race_final: number | null;
};

const ADVANCE = [2, 4, 8, 16];

/** How far the double elimination runs, in players left when the two brackets
 *  merge. 2 is the grand final — the whole draw played double elimination. */
const SINGLE_FROM = [2, 16, 8, 4];

/**
 * Four fields, so it lives in the club page's sheet rather than a route of its
 * own. `legs` and `advance` only appear where they mean something — a knockout
 * has no second leg, and only a group tournament has a cut.
 */
export default function TournamentForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: {
  initialValues?: TournamentValues;
  onSubmit: (values: TournamentValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}) {
  const { t } = useT();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [startsOn, setStartsOn] = useState(initialValues?.starts_on ?? "");
  const [endsOn, setEndsOn] = useState(initialValues?.ends_on ?? "");
  const [entryFee, setEntryFee] = useState(initialValues?.entry_fee ?? "");
  const [format, setFormat] = useState<TournamentFormat>(
    initialValues?.format ?? "double_elim",
  );
  const [category, setCategory] = useState<Category | null>(
    initialValues?.category ?? null,
  );
  const [legs, setLegs] = useState<1 | 2>(initialValues?.legs ?? 1);
  const [advance, setAdvance] = useState(initialValues?.advance ?? 4);
  const [singleFrom, setSingleFrom] = useState(initialValues?.single_from ?? 2);
  const [discipline, setDiscipline] = useState<Discipline>(
    initialValues?.discipline ?? "9ball",
  );
  const [raceTo, setRaceTo] = useState(String(initialValues?.race_to ?? 5));
  const [raceSemi, setRaceSemi] = useState(
    initialValues?.race_semi ? String(initialValues.race_semi) : "",
  );
  const [raceFinal, setRaceFinal] = useState(
    initialValues?.race_final ? String(initialValues.race_final) : "",
  );

  const roundRobin = format === "league" || format === "group_knockout";
  // A round robin has no closing stage, so a longer final would have nothing
  // to attach to.
  const hasFinal = format !== "league";
  const race = Number(raceTo);
  const raceValid = Number.isInteger(race) && race >= 1 && race <= 50;
  const optional = (value: string) => (value === "" ? null : Number(value));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!raceValid) return;
    onSubmit({
      name: name.trim(),
      starts_on: startsOn || null,
      // An end with no start is half a range, and the CHECK on the table
      // refuses it — see sql/schema.sql.
      ends_on: startsOn && endsOn ? endsOn : null,
      entry_fee: entryFee.trim() || null,
      format,
      category,
      legs,
      advance: format === "group_knockout" ? advance : null,
      single_from: format === "double_elim" ? singleFrom : 2,
      discipline,
      race_to: race,
      race_semi: hasFinal ? optional(raceSemi) : null,
      race_final: hasFinal ? optional(raceFinal) : null,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid content-start gap-4 sm:grid-cols-2"
    >
      <div className="space-y-1.5">
        <Label htmlFor="tournament-name">{t("tournaments.name")}</Label>
        <Input
          id="tournament-name"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>

      {/* Native date inputs: the browser already owns the calendar, the
          locale, the keyboard on a phone and the min/max clamp. A picker
          component would be a dependency for a field an organiser fills in
          once. */}
      <fieldset className="space-y-1.5">
        <Label htmlFor="tournament-starts">{t("tournaments.dates")}</Label>
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="tournament-starts"
            type="date"
            value={startsOn}
            aria-label={t("tournaments.startsOn")}
            onChange={(e) => setStartsOn(e.target.value)}
            disabled={isSubmitting}
          />
          <Input
            type="date"
            value={endsOn}
            // A day at a time: a range cannot end before it starts, and
            // nothing to end until there is a start.
            min={startsOn || undefined}
            disabled={isSubmitting || !startsOn}
            aria-label={t("tournaments.endsOn")}
            onChange={(e) => setEndsOn(e.target.value)}
          />
        </div>
        <p className="text-caption text-ink-faint">
          {t("tournaments.datesHint")}
        </p>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="tournament-fee">{t("tournaments.entryFee")}</Label>
        {/* Text, not a number: "15 €", "20 € / 10 € socios" and "free for
            members" are all real answers and none of them is an amount. */}
        <Input
          id="tournament-fee"
          value={entryFee}
          maxLength={80}
          placeholder={t("tournaments.entryFeePlaceholder")}
          onChange={(e) => setEntryFee(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tournament-format">{t("tournaments.format")}</Label>
        <Segmented<TournamentFormat>
          value={format}
          onChange={setFormat}
          label={t("tournaments.format")}
          options={[
            { value: "double_elim", label: t("tournaments.doubleElim") },
            { value: "league", label: t("tournaments.league") },
            { value: "group_knockout", label: t("tournaments.groupKnockout") },
          ]}
        />
        <p className="text-caption text-ink-faint">
          {t(`tournaments.hint.${format}`)}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tournament-category">{t("tournaments.category")}</Label>
        <Select
          id="tournament-category"
          value={category ?? ""}
          onChange={(e) =>
            setCategory(
              e.target.value ? (Number(e.target.value) as Category) : null,
            )
          }
          disabled={isSubmitting}
        >
          <option value="">{t("tournaments.combined")}</option>
          <option value={1}>{t("category.1")}</option>
          <option value={2}>{t("category.2")}</option>
          <option value={3}>{t("category.3")}</option>
        </Select>
      </div>

      {roundRobin && (
        <div className="space-y-1.5">
          <Label htmlFor="tournament-legs">{t("tournaments.legs")}</Label>
          <Select
            id="tournament-legs"
            value={legs}
            onChange={(e) => setLegs(Number(e.target.value) as 1 | 2)}
            disabled={isSubmitting}
          >
            <option value={1}>{t("tournaments.legs1")}</option>
            <option value={2}>{t("tournaments.legs2")}</option>
          </Select>
        </div>
      )}

      {format === "group_knockout" && (
        <div className="space-y-1.5">
          <Label htmlFor="tournament-advance">{t("tournaments.advance")}</Label>
          <Select
            id="tournament-advance"
            value={advance}
            onChange={(e) => setAdvance(Number(e.target.value))}
            disabled={isSubmitting}
          >
            {ADVANCE.map((n) => (
              <option key={n} value={n}>
                {t("tournaments.advanceN", { n })}
              </option>
            ))}
          </Select>
          {/* The number of groups follows from the cut: top two from each. */}
          <p className="text-caption text-ink-faint">
            {t("tournaments.advanceHint", {
              groups: groupCount(advance),
              min: minimumEntrants("group_knockout", advance),
            })}
          </p>
        </div>
      )}

      {format === "double_elim" && (
        <div className="space-y-1.5">
          <Label htmlFor="tournament-single-from">
            {t("tournaments.singleFrom")}
          </Label>
          <Select
            id="tournament-single-from"
            value={singleFrom}
            onChange={(e) => setSingleFrom(Number(e.target.value))}
            disabled={isSubmitting}
          >
            {SINGLE_FROM.map((n) => (
              <option key={n} value={n}>
                {n === 2
                  ? t("tournaments.singleFromNever")
                  : t("tournaments.singleFromN", { n })}
              </option>
            ))}
          </Select>
          {/* A cutoff wider than the field is not an error: the draw is then
              single elimination throughout. */}
          <p className="text-caption text-ink-faint">
            {t(
              singleFrom === 2
                ? "tournaments.singleFromHintNever"
                : "tournaments.singleFromHint",
              { n: singleFrom },
            )}
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="tournament-discipline">
          {t("tournaments.discipline")}
        </Label>
        <Segmented<Discipline>
          value={discipline}
          onChange={setDiscipline}
          label={t("tournaments.discipline")}
          options={DISCIPLINES.map((d) => ({
            value: d,
            label: t(`discipline.${d}`),
            icon: <DisciplineBall discipline={d} />,
          }))}
        />
      </div>

      <fieldset className="space-y-1.5">
        <Label htmlFor="tournament-race">{t("tournaments.raceTo")}</Label>
        <div className={hasFinal ? "grid grid-cols-3 gap-3" : ""}>
          <Input
            id="tournament-race"
            type="number"
            inputMode="numeric"
            min={1}
            max={50}
            value={raceTo}
            onChange={(e) => setRaceTo(e.target.value)}
            className="font-mono"
            required
            disabled={isSubmitting}
          />
          {/* Blank means "same as the base race" — an organiser who wants one
              length throughout should not have to type it three times. */}
          {hasFinal && (
            <>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                value={raceSemi}
                placeholder={raceTo}
                aria-label={t("tournaments.raceSemi")}
                onChange={(e) => setRaceSemi(e.target.value)}
                className="font-mono"
                disabled={isSubmitting}
              />
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                value={raceFinal}
                placeholder={raceTo}
                aria-label={t("tournaments.raceFinal")}
                onChange={(e) => setRaceFinal(e.target.value)}
                className="font-mono"
                disabled={isSubmitting}
              />
            </>
          )}
        </div>
        <p className="text-caption text-ink-faint">
          {hasFinal ? t("tournaments.raceHint") : t("tournaments.raceHintFlat")}
        </p>
      </fieldset>

      <div className="flex justify-end gap-3 pt-2 sm:col-span-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !name.trim() || !raceValid}
        >
          {isSubmitting ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}
