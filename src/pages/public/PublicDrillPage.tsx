import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import DrillCard from "@/components/drills/DrillCard";
import PublicShell from "@/components/layout/PublicShell";
import PoolTableDiagram from "@/components/drills/PoolTableDiagram";
import ShareButton from "@/components/social/ShareButton";
import { Card } from "@/components/ui/Card";
import { DifficultyTag } from "@/components/ui/DifficultyTag";
import { SectionHead } from "@/components/ui/SectionHead";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useTablePortrait } from "@/hooks/useMedia";
import { publicDrillsQuery } from "@/queries/public/drills";
import { useSession } from "@/hooks/useAuth";
import { useT } from "@/i18n";

const route = getRouteApi("/_public/drills/$drillId");

/** Related drills shown below the fold — enough to browse from, not a second
 *  catalog. */
const RELATED_COUNT = 4;

/**
 * One drill, free to read: the table, what to set up, how to score it.
 *
 * No log form and no recent results, which is the whole of the difference from
 * the club's version — a score belongs to a player in a club, and drill_logs is
 * not readable without an account by design. So the page ends on the one thing a
 * reader might want next, which is somewhere to keep their own scores — or
 * another drill to try.
 */
export default function PublicDrillPage() {
  const { t } = useT();
  const { user } = useSession();
  const portrait = useTablePortrait();
  const { drill, origin } = route.useLoaderData();

  const { data: sameSkill } = useSuspenseQuery(
    publicDrillsQuery({ skill_type: drill.skill_type }),
  );
  const related = sameSkill
    .filter((d) => d.id !== drill.id)
    .slice(0, RELATED_COUNT);

  const url = `${origin}/drills/${drill.id}`;

  return (
    <PublicShell>
      <div className="grid gap-8 pt-6 lg:grid-cols-12 lg:items-start">
        {/* The diagram leads, but a turned table is tall and the setup text is
            long, so the columns split the other way round: the table is capped
            anyway and the words get the room they need. */}
        <div className="lg:col-span-5">
          <div
            className={`mx-auto w-full rounded-sheet border border-hairline-strong bg-felt p-2 lg:sticky lg:top-4 ${
              portrait ? "max-w-[420px]" : ""
            }`}
          >
            <PoolTableDiagram
              ballPositions={drill.ball_positions}
              shotPaths={drill.shot_paths}
              portrait={portrait}
              // Below lg the sticky top nav is the only fixed bar, so an
              // upright table only has that (and its own margin) to clear.
              className="max-h-[calc(100dvh-4rem-2rem-env(safe-area-inset-top))] rounded-[14px] lg:max-h-none"
            />
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-display leading-[1.05] font-semibold tracking-tighter text-ink">
                {drill.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-caption text-ink-soft">
                <DifficultyTag difficulty={drill.difficulty} />
                <span className="text-ink-ghost">·</span>
                <span className="text-ink-faint">
                  {t(`skill.${drill.skill_type}`)}
                </span>
                <span className="text-ink-ghost">·</span>
                <span className="text-ink-faint">
                  {t("drills.maxPoints", { n: drill.max_score })}
                </span>
              </div>
            </div>
            <ShareButton
              title={drill.name}
              url={url}
              text={drill.description}
            />
          </div>

          <p className="mt-6 text-h3 leading-relaxed text-ink">
            {drill.description}
          </p>

          <ol className="mt-8 flex flex-col gap-6">
            <li className="flex gap-4">
              <span className="font-mono text-display font-semibold text-strike/30">
                1
              </span>
              <div className="min-w-0 pt-2">
                <h2 className="text-caption font-medium tracking-[0.08em] text-ink-faint uppercase">
                  {t("drills.setup")}
                </h2>
                <p className="mt-1 text-body text-ink-soft">
                  {drill.setup_instructions}
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="font-mono text-display font-semibold text-strike/30">
                2
              </span>
              <div className="min-w-0 pt-2">
                <h2 className="text-caption font-medium tracking-[0.08em] text-ink-faint uppercase">
                  {t("drills.scoring")}
                </h2>
                <p className="mt-1 text-body text-ink-soft">
                  {drill.scoring_method}
                </p>
              </div>
            </li>
          </ol>

          <Card className="mt-8 flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-body font-medium text-ink">
                {t("public.publicDrill.ctaTitle")}
              </p>
              <p className="mt-0.5 text-caption text-ink-faint">
                {t("public.publicDrill.ctaHint")}
              </p>
            </div>
            <Link
              to="/app"
              className={buttonClasses({ size: "sm", className: "shrink-0" })}
            >
              {t(user ? "auth.openApp" : "public.cta.signIn")}
            </Link>
          </Card>

          <Link
            to="/drills"
            className={buttonClasses({
              variant: "ghost",
              size: "sm",
              className: "mt-3",
            })}
          >
            {t("drills.seeAll")}
          </Link>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <SectionHead title={t("public.publicDrill.related")} />
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {related.map((d, i) => (
              <DrillCard key={d.id} drill={d} public index={i} />
            ))}
          </div>
        </section>
      )}
    </PublicShell>
  );
}
