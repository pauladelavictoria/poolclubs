import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { LuTarget } from "react-icons/lu";
import PublicShell from "@/components/PublicShell";
import DrillCard from "@/components/DrillCard";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterPills } from "@/components/ui/FilterPills";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { useDebouncedQuery } from "@/libs/useDebouncedQuery";
import { publicDrillsQuery } from "@/queries/public";
import { DIFFICULTIES, SKILL_TYPES } from "@/types";
import { useT } from "@/i18n";

const route = getRouteApi("/_public/drills/");

/**
 * The shared catalog, as anyone can see it.
 *
 * Not paginated, unlike the other three directories: the catalog is a fixed few
 * hundred drills that the two facets cut down hard, and a wall of tables is the
 * point — a pager would break the one page worth scrolling.
 */
export default function PublicDrillsPage() {
  const { t } = useT();
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const { data: drills } = useSuspenseQuery(
    publicDrillsQuery({
      q: search.q,
      difficulty: search.difficulty,
      skill_type: search.skill,
    }),
  );

  const [q, setQ] = useDebouncedQuery(search.q ?? "", (value) =>
    navigate({ search: { ...search, q: value || undefined }, replace: true }),
  );

  const filtered = Boolean(search.q ?? search.difficulty ?? search.skill);

  return (
    <PublicShell
      title={t("public.publicDrills.title")}
      subtitle={t("public.publicDrills.subtitle")}
    >
      <div className="flex flex-col gap-3">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={t("public.publicDrills.searchPlaceholder")}
          className="w-full sm:max-w-sm"
        />
        <FilterPills
          label={t("drills.filterDifficulty")}
          anyLabel={t("drills.allDifficulties")}
          value={search.difficulty}
          onChange={(difficulty) => navigate({ search: { ...search, difficulty } })}
          options={DIFFICULTIES.map((key) => ({
            value: key,
            label: t(`difficulty.${key}`),
          }))}
        />
        <FilterPills
          label={t("drills.filterSkill")}
          anyLabel={t("drills.allSkills")}
          value={search.skill}
          onChange={(skill) => navigate({ search: { ...search, skill } })}
          options={SKILL_TYPES.map((key) => ({
            value: key,
            label: t(`skill.${key}`),
          }))}
        />
      </div>

      {drills.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            icon={<LuTarget className="h-5 w-5" aria-hidden />}
            title={t("drills.noneMatch")}
            hint={t("drills.noneMatchHint")}
            action={
              filtered ? (
                <Button
                  variant="secondary"
                  onClick={() => navigate({ search: {} })}
                >
                  {t("common.clearFilters")}
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {drills.map((drill) => (
            <DrillCard key={drill.id} drill={drill} public />
          ))}
        </div>
      )}
    </PublicShell>
  );
}
