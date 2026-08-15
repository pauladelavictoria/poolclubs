import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { LuTarget } from "react-icons/lu";
import PublicShell, { CtaBand } from "@/components/PublicShell";
import DrillCard from "@/components/DrillCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterPills } from "@/components/ui/FilterPills";
import { SearchInput } from "@/components/ui/SearchInput";
import { Shot } from "@/components/ui/Shot";
import { useDebouncedQuery } from "@/libs/useDebouncedQuery";
import { publicDrillsQuery } from "@/queries/public";
import {
  CLUB_BALL_COLORS,
  DIFFICULTIES,
  SKILL_TYPES,
  type BallColor,
  type Drill,
  type DrillDifficulty,
  type DrillSkillType,
} from "@/types";
import { useT } from "@/i18n";

const route = getRouteApi("/_public/drills/");

/** 8 skills, 8 balls, exact mapping — the same rack order the ball tokens
 *  already use, so the rail reads as "one skill, one colour" rather than an
 *  arbitrary assignment. */
const SKILL_BALL: Record<DrillSkillType, BallColor> = Object.fromEntries(
  SKILL_TYPES.map((skill, i) => [skill, CLUB_BALL_COLORS[i]]),
) as Record<DrillSkillType, BallColor>;

/**
 * The shared catalog, as anyone can see it.
 *
 * Not paginated, unlike the other three directories: the catalog is a fixed few
 * hundred drills that the two facets cut down hard, and a wall of tiles is the
 * point — a pager would break the one page worth scrolling.
 *
 * The skill filter is fetched separately from the query params it drives: every
 * drill matching search + difficulty comes back regardless of which skill is
 * selected, so the rail's counts stay live rather than collapsing to whichever
 * skill happens to be active.
 */
export default function PublicDrillsPage() {
  const { t } = useT();
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const { data: drills } = useSuspenseQuery(
    publicDrillsQuery({ q: search.q, difficulty: search.difficulty }),
  );

  const [q, setQ] = useDebouncedQuery(search.q ?? "", (value) =>
    navigate({ search: { ...search, q: value || undefined }, replace: true }),
  );

  const bySkill = (skill: DrillSkillType) =>
    drills.filter((d) => d.skill_type === skill);

  const shown = search.skill
    ? drills.filter((d) => d.skill_type === search.skill)
    : drills;

  const filtered = Boolean(search.q ?? search.difficulty ?? search.skill);

  const groups: { difficulty: DrillDifficulty; rows: Drill[] }[] = search.difficulty
    ? []
    : DIFFICULTIES.map((difficulty) => ({
        difficulty,
        rows: shown.filter((d) => d.difficulty === difficulty),
      })).filter((g) => g.rows.length > 0);

  return (
    <PublicShell>
      <section className="relative mt-6 overflow-hidden rounded-sheet border border-hairline-strong bg-felt">
        <Shot
          name="hero-drills"
          seed="drills-hero"
          size={[1600, 900]}
          alt=""
          priority
          className="absolute inset-0 h-full opacity-60"
        />
        <div className="scrim absolute inset-0" />
        <div className="relative flex min-h-[200px] flex-col justify-end gap-2 p-6 sm:min-h-[260px] sm:p-8">
          <h1 className="text-h1 font-semibold tracking-tight text-ink md:text-display">
            {t("public.publicDrills.title")}
          </h1>
          <p className="max-w-[52ch] text-body text-ink-soft sm:text-h4">
            {t("public.publicDrills.subtitle")}
          </p>
        </div>
      </section>

      <section className="mt-10">
        <div className="no-bar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
          {SKILL_TYPES.map((skill) => {
            const active = search.skill === skill;
            return (
              <button
                key={skill}
                type="button"
                data-ball={SKILL_BALL[skill]}
                aria-pressed={active}
                onClick={() =>
                  navigate({
                    search: { ...search, skill: active ? undefined : skill },
                  })
                }
                className={`wash flex shrink-0 snap-start flex-col items-start gap-1.5 rounded-card border px-4 py-3 text-left transition-colors duration-150 ${
                  active ? "border-strike" : "border-hairline hover:border-hairline-strong"
                }`}
              >
                <span className="text-body font-semibold text-ink">
                  {t(`skill.${skill}`)}
                </span>
                <span className="font-mono text-caption tabular-nums text-ink-faint">
                  {bySkill(skill).length}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="sticky top-16 z-10 -mx-4 mt-10 flex flex-col gap-3 border-y border-hairline bg-pocket/90 px-4 py-3 backdrop-blur-lg sm:-mx-6 sm:px-6">
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
      </div>

      {shown.length === 0 ? (
        <Card className="mt-6">
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
      ) : search.difficulty ? (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {shown.map((drill, i) => (
            <DrillCard key={drill.id} drill={drill} public index={i} />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map(({ difficulty, rows }) => (
            <section key={difficulty}>
              <h2 className="px-1 pb-2 text-caption font-medium tracking-[0.08em] text-ink-faint uppercase">
                {t(`difficulty.${difficulty}`)}
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {rows.map((drill, i) => (
                  <DrillCard key={drill.id} drill={drill} public index={i} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <CtaBand />
    </PublicShell>
  );
}
