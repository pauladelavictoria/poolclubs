import { Link, getRouteApi } from "@tanstack/react-router";
import PublicShell from "@/components/PublicShell";
import PoolTableDiagram from "@/components/PoolTableDiagram";
import ShareButton from "@/components/ShareButton";
import { Card } from "@/components/ui/Card";
import { DifficultyTag } from "@/components/ui/DifficultyTag";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useTablePortrait } from "@/libs/useMedia";
import { useT } from "@/i18n";

const route = getRouteApi("/_public/drills/$drillId");

/**
 * One drill, free to read: the table, what to set up, how to score it.
 *
 * No log form and no recent results, which is the whole of the difference from
 * the club's version — a score belongs to a player in a club, and drill_logs is
 * not readable without an account by design. So the page ends on the one thing a
 * reader might want next, which is somewhere to keep their own scores.
 */
export default function PublicDrillPage() {
  const { t } = useT();
  const portrait = useTablePortrait();
  const { drill, origin } = route.useLoaderData();

  const url = `${origin}/drills/${drill.id}`;

  return (
    <PublicShell>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-h1 font-semibold tracking-tight text-ink">
            {drill.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-caption text-ink-soft">
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
        <ShareButton title={drill.name} url={url} text={drill.description} />
      </header>

      {/* Same split as the club's drill page: wide enough and the table sits
          beside the reading rather than above it, and stays put while the
          instructions scroll. */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        <div
          className={`mx-auto w-full lg:sticky lg:top-20 ${
            portrait ? "max-w-[420px]" : ""
          }`}
        >
          <PoolTableDiagram
            ballPositions={drill.ball_positions}
            shotPaths={drill.shot_paths}
            portrait={portrait}
          />
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-h4 text-ink">{drill.description}</p>

            <h2 className="mt-5 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
              {t("drills.setup")}
            </h2>
            <p className="mt-1 text-body text-ink-soft">
              {drill.setup_instructions}
            </p>

            <h2 className="mt-4 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
              {t("drills.scoring")}
            </h2>
            <p className="mt-1 text-body text-ink-soft">
              {drill.scoring_method}
            </p>
          </Card>

          <Card className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
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
              {t("public.cta.signIn")}
            </Link>
          </Card>

          <Link
            to="/drills"
            className={buttonClasses({ variant: "ghost", size: "sm" })}
          >
            {t("drills.seeAll")}
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
