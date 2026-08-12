import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { LuTarget } from "react-icons/lu";
import PageHeader from "@/components/PageHeader";
import DrillCard from "@/components/DrillCard";
import { useGetDrills } from "@/hooks/useGetDrills";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useAuth } from "@/hooks/useAuth";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useTrainingPlan } from "@/hooks/useTrainingPlan";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DrillDifficulty, DrillSkillType } from "@/types";
import { DIFFICULTIES, SKILL_TYPES } from "@/types";
import { useT } from "@/i18n";

export default function DrillsPage() {
  const { t } = useT();
  const [difficulty, setDifficulty] = useState<DrillDifficulty | "">("");
  const [skillType, setSkillType] = useState<DrillSkillType | "">("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: drills, isLoading } = useGetDrills({
    difficulty: difficulty || undefined,
    skill_type: skillType || undefined,
  });
  const { data: players } = useGetPlayers();
  const { generatePlan } = useTrainingPlan(selectedPlayerId ?? undefined);

  const handleGeneratePlan = () => {
    const player = players?.find((p) => p.id === selectedPlayerId);
    if (!player) {
      toast.error(t("drills.selectPlayerError"));
      return;
    }

    generatePlan.mutate(
      { playerId: player.id, category: player.category },
      {
        onSuccess: () => navigate(`/app/players/${player.id}/training/plan`),
        onError: () => toast.error(t("drills.planError")),
      },
    );
  };

  return (
    <>
      <PageHeader section="drills" title={t("drills.title")}>
        {user && (
          <Link
            to="/app/drills/new"
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            {t("drills.new")}
          </Link>
        )}
      </PageHeader>

      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        {/* The primary action on this screen: get a plan. It leads. */}
        <Card className="p-5">
          <h2 className="text-h4 font-semibold text-ink">
            {t("drills.autoPlan")}
          </h2>
          <p className="mt-1 max-w-[52ch] text-body text-ink-soft">
            {t("drills.autoPlanHint")}
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Select
              className="flex-1"
              aria-label={t("drills.planPlayer")}
              value={selectedPlayerId ?? ""}
              onChange={(e) =>
                setSelectedPlayerId(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            >
              <option value="">{t("drills.selectPlayer")}</option>
              {players?.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} ({t("category.short", { n: player.category })})
                </option>
              ))}
            </Select>

            <Button
              onClick={handleGeneratePlan}
              disabled={!selectedPlayerId || generatePlan.isPending}
              className="shrink-0"
            >
              {generatePlan.isPending
                ? t("drills.generating")
                : t("drills.generatePlan")}
            </Button>
          </div>

          {selectedPlayerId && (
            <Link
              to={`/app/players/${selectedPlayerId}/training/plan`}
              className="mt-3 inline-block text-caption font-medium text-ink-faint transition-colors duration-150 hover:text-ink"
            >
              {t("drills.viewCurrentPlan")}
            </Link>
          )}
        </Card>

        {/* The filters are their own control strip. The drills below are cards
            in their own right, so wrapping the grid in another card would put
            a border around a field of borders — and a second card up here made
            the top of the page look like every other page in the app. */}
        <div className="rounded-control border border-hairline bg-felt p-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              className="flex-1"
              aria-label={t("drills.filterDifficulty")}
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as DrillDifficulty | "")
              }
            >
              <option value="">{t("drills.allDifficulties")}</option>
              {DIFFICULTIES.map((key) => (
                <option key={key} value={key}>
                  {t(`difficulty.${key}`)}
                </option>
              ))}
            </Select>

            <Select
              className="flex-1"
              aria-label={t("drills.filterSkill")}
              value={skillType}
              onChange={(e) =>
                setSkillType(e.target.value as DrillSkillType | "")
              }
            >
              <option value="">{t("drills.allSkills")}</option>
              {SKILL_TYPES.map((key) => (
                <option key={key} value={key}>
                  {t(`skill.${key}`)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-card border border-hairline bg-felt"
              >
                {/* Same shape as the card it stands in for, table included, so
                    nothing jumps when the drills arrive. */}
                <Skeleton className="aspect-[922/1734] w-full rounded-none" />
                <div className="p-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="mt-2 h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : drills && drills.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {drills.map((drill) => (
              <DrillCard key={drill.id} drill={drill} />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={<LuTarget className="h-5 w-5" />}
              title={t("drills.noneMatch")}
              hint={t("drills.noneMatchHint")}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDifficulty("");
                    setSkillType("");
                  }}
                >
                  {t("common.clearFilters")}
                </Button>
              }
            />
          </Card>
        )}
      </div>
    </>
  );
}
