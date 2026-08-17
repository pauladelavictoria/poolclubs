import { getRouteApi } from "@tanstack/react-router";
import { LuPlus, LuTarget } from "react-icons/lu";
import PageTitle from "@/components/layout/PageTitle";
import DrillCard from "@/components/drills/DrillCard";
import { useGetDrills } from "@/hooks/useGetDrills";
import { useAuth } from "@/hooks/useAuth";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { FilterBar } from "@/components/ui/FilterBar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DrillDifficulty, DrillSkillType } from "@/types";
import { DIFFICULTIES, SKILL_TYPES } from "@/types";
import { useT } from "@/i18n";
import { AppLink } from "@/components/layout/AppLink";

const route = getRouteApi("/app/_authed/$clubSlug/drills/");

export default function DrillsPage() {
  const { t } = useT();
  // In the URL rather than in useState, so the route's loader can fetch the
  // filtered library before this renders — and so a filtered library is a link.
  const { difficulty, skill } = route.useSearch();
  const navigate = route.useNavigate();

  const setFilter = (patch: {
    difficulty?: DrillDifficulty;
    skill?: DrillSkillType;
  }) => navigate({ search: (prev) => ({ ...prev, ...patch }) });

  const { user } = useAuth();
  const { data: drills, isLoading } = useGetDrills({
    difficulty,
    skill_type: skill,
  });

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        <PageTitle title={t("drills.title")}>
          {user && (
            <AppLink
              to="/app/$clubSlug/drills/new"
              className={buttonClasses({ size: "sm", className: "shrink-0" })}
            >
              <LuPlus className="h-4 w-4" aria-hidden />
              {t("drills.new")}
            </AppLink>
          )}
        </PageTitle>

        {/* The filters are their own control strip. The drills below are cards
            in their own right, so wrapping the grid in another card would put
            a border around a field of borders — and a second card up here made
            the top of the page look like every other page in the app.
            Same <FilterBar> the games tape wears: these are facets on a list,
            not fields on a form, so they are sized to their labels rather than
            stretched to half the page each. */}
        <FilterBar>
          <Select
            size="sm"
            aria-label={t("drills.filterDifficulty")}
            value={difficulty ?? ""}
            onChange={(e) =>
              setFilter({
                difficulty: (e.target.value as DrillDifficulty) || undefined,
              })
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
            size="sm"
            aria-label={t("drills.filterSkill")}
            value={skill ?? ""}
            onChange={(e) =>
              setFilter({
                skill: (e.target.value as DrillSkillType) || undefined,
              })
            }
          >
            <option value="">{t("drills.allSkills")}</option>
            {SKILL_TYPES.map((key) => (
              <option key={key} value={key}>
                {t(`skill.${key}`)}
              </option>
            ))}
          </Select>
        </FilterBar>

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
                    navigate({ search: {} });
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
