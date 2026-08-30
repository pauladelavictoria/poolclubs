import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { LuTarget } from "react-icons/lu";
import PublicShell, { CtaBand } from "@/components/layout/PublicShell";
import DrillCard from "@/components/drills/DrillCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterGroup, FilterMenu } from "@/components/ui/FilterMenu";
import { FilterPills } from "@/components/ui/FilterPills";
import { SearchInput } from "@/components/ui/SearchInput";
import { useDebouncedQuery } from "@/hooks/useDebouncedQuery";
import { publicDrillsQuery } from "@/queries/public/drills";
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

  const bySkill = (skill: DrillSkillType) =>
    drills.filter((d) => d.skill_type === skill);

  const shown = search.skill
    ? drills.filter((d) => d.skill_type === search.skill)
    : drills;

  const filtered = Boolean(search.q ?? search.difficulty ?? search.skill);

  // `replace`: typing is one intent, not one history entry per pause.
  const [q, setQ] = useDebouncedQuery(search.q ?? "", (value) =>
    navigate({ search: { ...search, q: value || undefined }, replace: true }),
  );

  const groups: { difficulty: DrillDifficulty; rows: Drill[] }[] =
    search.difficulty
      ? []
      : DIFFICULTIES.map((difficulty) => ({
          difficulty,
          rows: shown.filter((d) => d.difficulty === difficulty),
        })).filter((g) => g.rows.length > 0);

  return (
    <>
      <section>
        <div className="px-4 py-6 sm:px-6 sm:py-8">
          <h1 className="text-display leading-[1.05] font-semibold tracking-tighter text-ink">
            {t("public.publicDrills.title")}
          </h1>
          <p className="mt-2 max-w-[46ch] text-h4 text-ink-soft">
            {t("public.publicDrills.subtitle")}
          </p>
        </div>
      </section>

      <PublicShell>
        {/* The skill facet, as a rail rather than a second row of pills: eight
            options each carrying a live count is more than a pill row can hold,
            and the colour is what makes it scannable. Not in the hero — it is a
            filter, and it belongs next to the other one. */}
        <section className="mt-8">
          {/* py-2 rather than pb-1: the scroller clips vertically as soon as it
              scrolls horizontally, and .lift rises 3px with a shadow under it. */}
          <div className="no-bar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 py-2 sm:-mx-6 sm:px-6">
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
                  // One line, pill height: eight of these are a facet row, not
                  // eight cards, and at this size the rail reads in a glance
                  // instead of eating the fold. wash-soft, not bare wash: the
                  // label sits *on* the colour, and a full-strength wash of
                  // eight hues carries no ink token at AA. .lift is what the
                  // other public rails wear and brings its own transition.
                  className={`wash wash-soft lift flex shrink-0 snap-start items-center gap-2 rounded-full border px-3 py-1.5 whitespace-nowrap ${
                    active
                      ? "border-strike"
                      : "border-hairline hover:border-hairline-strong"
                  }`}
                >
                  {/* The skill's colour, said out loud. A wash this small is a
                      hint at best; the dot is what makes the rail scannable,
                      and it takes --color-club straight from data-ball. */}
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-club"
                    aria-hidden
                  />
                  <span className="text-caption font-medium text-ink">
                    {t(`skill.${skill}`)}
                  </span>
                  {/* Yellow when on: out here --color-strike means "current",
                      and ink-soft rather than ink-faint because faint does not
                      clear AA on a wash in light mode. */}
                  <span
                    className={`font-mono text-caption tabular-nums ${
                      active ? "text-strike" : "text-ink-soft"
                    }`}
                  >
                    {bySkill(skill).length}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-10 -mx-4 mt-8 bg-pocket/90 px-4 py-3 backdrop-blur-lg sm:-mx-6 sm:px-6">
          <div className="flex items-center gap-3">
            <FilterMenu activeCount={search.difficulty ? 1 : 0}>
              <FilterGroup label={t("drills.filterDifficulty")}>
                <FilterPills
                  label={t("drills.filterDifficulty")}
                  anyLabel={t("drills.allDifficulties")}
                  value={search.difficulty}
                  onChange={(difficulty) =>
                    navigate({ search: { ...search, difficulty } })
                  }
                  options={DIFFICULTIES.map((key) => ({
                    value: key,
                    label: t(`difficulty.${key}`),
                  }))}
                />
              </FilterGroup>
            </FilterMenu>
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder={t("public.publicDrills.searchPlaceholder")}
              className="min-w-0 flex-1"
            />
          </div>
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
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {shown.map((drill, i) => (
              <DrillCard key={drill.id} drill={drill} public index={i} />
            ))}
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            {groups.map(({ difficulty, rows }) => (
              <section key={difficulty}>
                <h2 className="px-1 pb-3 text-caption font-medium tracking-[0.08em] text-ink-faint uppercase">
                  {t(`difficulty.${difficulty}`)}
                </h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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
    </>
  );
}
