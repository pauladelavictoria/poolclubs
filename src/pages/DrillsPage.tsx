import { useState } from "react";
import { Link } from "react-router-dom";
import { LuPlus, LuTarget } from "react-icons/lu";
import PageTitle from "@/components/PageTitle";
import DrillCard from "@/components/DrillCard";
import { useGetDrills } from "@/hooks/useGetDrills";
import { useAuth } from "@/hooks/useAuth";
import { buttonClasses } from "@/components/ui/buttonStyles";
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

  const { user } = useAuth();
  const { data: drills, isLoading } = useGetDrills({
    difficulty: difficulty || undefined,
    skill_type: skillType || undefined,
  });

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        <PageTitle title={t("drills.title")}>
          {user && (
            <Link
              to="/app/drills/new"
              className={buttonClasses({ size: "sm", className: "shrink-0" })}
            >
              <LuPlus className="h-4 w-4" aria-hidden />
              {t("drills.new")}
            </Link>
          )}
        </PageTitle>

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
