import { useState } from "react";
import { toast } from "react-toastify";
import CancelLink from "@/components/layout/CancelLink";
import DrillGeometryEditor from "@/components/drills/DrillGeometryEditor";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import {
  DIFFICULTIES,
  SKILL_TYPES,
  type BallPosition,
  type Drill,
  type DrillDifficulty,
  type DrillSkillType,
  type ShotPath,
} from "@/types";
import type { DrillInput } from "@/hooks/useManageDrills";
import { useT } from "@/i18n";

type DrillFormProps = {
  initial?: Drill;
  onSubmit: (values: DrillInput) => void;
  onDelete?: () => void;
  isSubmitting?: boolean;
};

export default function DrillForm({
  initial,
  onSubmit,
  onDelete,
  isSubmitting = false,
}: DrillFormProps) {
  const { t } = useT();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [difficulty, setDifficulty] = useState<DrillDifficulty>(
    initial?.difficulty ?? "beginner",
  );
  const [skillType, setSkillType] = useState<DrillSkillType>(
    initial?.skill_type ?? "potting",
  );
  const [setupInstructions, setSetupInstructions] = useState(
    initial?.setup_instructions ?? "",
  );
  const [scoringMethod, setScoringMethod] = useState(
    initial?.scoring_method ?? "",
  );
  const [maxScore, setMaxScore] = useState(String(initial?.max_score ?? 10));

  const [balls, setBalls] = useState<BallPosition[]>(
    initial?.ball_positions ?? [],
  );
  const [paths, setPaths] = useState<ShotPath[]>(initial?.shot_paths ?? []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const score = Number(maxScore);
    if (!name.trim()) return toast.error(t("drillForm.nameRequired"));
    if (!Number.isFinite(score) || score < 1)
      return toast.error(t("drillForm.maxScoreMin"));
    if (balls.length === 0) return toast.error(t("drillForm.needBall"));

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      difficulty,
      skill_type: skillType,
      setup_instructions: setupInstructions.trim(),
      scoring_method: scoringMethod.trim(),
      max_score: score,
      ball_positions: balls,
      shot_paths: paths,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DrillGeometryEditor
        balls={balls}
        setBalls={setBalls}
        paths={paths}
        setPaths={setPaths}
      />

      <Card className="overflow-hidden">
        <CardHeader title={t("drillForm.details")} />
        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="drill-name">{t("drillForm.name")}</Label>
            <Input
              id="drill-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="drill-description">
              {t("drillForm.description")}
            </Label>
            <Textarea
              id="drill-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="drill-difficulty">
                {t("drillForm.difficulty")}
              </Label>
              <Select
                id="drill-difficulty"
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value as DrillDifficulty)
                }
                disabled={isSubmitting}
              >
                {DIFFICULTIES.map((key) => (
                  <option key={key} value={key}>
                    {t(`difficulty.${key}`)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex-1 space-y-1.5">
              <Label htmlFor="drill-skill">{t("drillForm.skill")}</Label>
              <Select
                id="drill-skill"
                value={skillType}
                onChange={(e) => setSkillType(e.target.value as DrillSkillType)}
                disabled={isSubmitting}
              >
                {SKILL_TYPES.map((key) => (
                  <option key={key} value={key}>
                    {t(`skill.${key}`)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="drill-setup">{t("drillForm.setup")}</Label>
            <Textarea
              id="drill-setup"
              value={setupInstructions}
              onChange={(e) => setSetupInstructions(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="drill-scoring">{t("drillForm.scoring")}</Label>
            <Textarea
              id="drill-scoring"
              value={scoringMethod}
              onChange={(e) => setScoringMethod(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5 sm:max-w-[12rem]">
            <Label htmlFor="drill-max-score">{t("drillForm.maxScore")}</Label>
            <Input
              id="drill-max-score"
              type="number"
              min={1}
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={isSubmitting}
          >
            {t("common.delete")}
          </Button>
        )}
        {/* Route-aware, unlike the rest of this form: it always means "back to
            the drill this page hangs off", which the route already declares. */}
        <CancelLink />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}
