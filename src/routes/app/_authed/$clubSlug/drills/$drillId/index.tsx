import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import DrillDetailPage from "@/pages/app/DrillDetailPage";
import { drillLogsQuery, drillQuery } from "@/queries/drills";

export const Route = createFileRoute("/app/_authed/$clubSlug/drills/$drillId/")(
  {
    staticData: {
      section: "drills",
      crumbs: [{ labelKey: "drills.title", to: "/app/$clubSlug/drills" }],
    },
    // Set when the drill was opened from a training plan, so logging a result can
    // tick the step off.
    validateSearch: z.object({
      plan: z.coerce.number().int().positive().optional(),
      step: z.coerce.number().int().positive().optional(),
      playerId: z.coerce.number().int().positive().optional(),
    }),
    loader: async ({ context, params }) => {
      const drillId = Number(params.drillId);
      await Promise.all([
        context.queryClient.ensureQueryData(drillQuery(drillId)),
        context.queryClient.ensureQueryData(
          drillLogsQuery({ drill_id: drillId }),
        ),
      ]);
    },
    component: DrillDetailPage,
  },
);
