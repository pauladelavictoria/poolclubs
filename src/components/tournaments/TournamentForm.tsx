import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { DisciplineBall } from "@/components/ui/Ball";
import { groupCount, minimumEntrants } from "@/libs/bracket";
import {
  DISCIPLINES,
  type Category,
  type Discipline,
  type TournamentFormat,
} from "@/types";
import { useT } from "@/i18n";

export type TournamentValues = {
  name: string;
  format: TournamentFormat;
  category: Category | null;
  legs: 1 | 2;
  advance: number | null;
  discipline: Discipline;
  race_to: number;
  race_semi: number | null;
  race_final: number | null;
};

const ADVANCE = [2, 4, 8, 16];

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
  const [format, setFormat] = useState<TournamentFormat>(
    initialValues?.format ?? "double_elim",
  );
  const [category, setCategory] = useState<Category | null>(
    initialValues?.category ?? null,
  );
  const [legs, setLegs] = useState<1 | 2>(initialValues?.legs ?? 1);
  const [advance, setAdvance] = useState(initialValues?.advance ?? 4);
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
      format,
      category,
      legs,
      advance: format === "group_knockout" ? advance : null,
      discipline,
      race_to: race,
      race_semi: hasFinal ? optional(raceSemi) : null,
      race_final: hasFinal ? optional(raceFinal) : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <div className="flex justify-end gap-3 pt-2">
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
