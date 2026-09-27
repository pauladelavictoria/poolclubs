import { createFileRoute } from "@tanstack/react-router";
import { ogHandler } from "@/libs/server/ogRoute";
import { translate } from "@/i18n/translate";
import type { BallPosition, DrillDifficulty, ShotPath } from "@/types";

/** One drill's link-preview image: its name and its table. Shared-catalog
 *  drills only — a club's own drill has no public page to preview. See
 *  libs/server/ogRoute.ts for what every card route shares. */
export const Route = createFileRoute("/api/og/drills/$")({
  server: {
    handlers: {
      GET: ogHandler(async ({ key, supabase, cardImage, size, markUrl }) => {
        const id = Number(key);
        if (!Number.isInteger(id) || id < 1) return null;

        const { data: drill } = await supabase
          .from("drills")
          .select("name, difficulty, max_score, ball_positions, shot_paths")
          .eq("id", id)
          .is("club_id", null)
          .maybeSingle();
        if (!drill) return null;

        return cardImage.renderDrillCardPng(
          {
            byline: translate("es", "drills.cardByline"),
            title: drill.name,
            subtitle: [
              translate(
                "es",
                `difficulty.${drill.difficulty as DrillDifficulty}`,
              ),
              translate("es", "drills.maxPoints", { n: drill.max_score }),
            ].join(" · "),
            balls: drill.ball_positions as BallPosition[],
            paths: drill.shot_paths as ShotPath[],
          },
          { markUrl, size, tableUrl: new URL("/table.png", markUrl).href },
        );
      }),
    },
  },
});
