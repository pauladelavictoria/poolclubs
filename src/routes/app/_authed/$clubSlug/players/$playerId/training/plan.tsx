import { createFileRoute, redirect } from "@tanstack/react-router";
import TrainingPlanPage from "@/pages/TrainingPlanPage";
import { PLAYER_CRUMBS } from "@/libs/crumbs";
import { trainingPlanQuery } from "@/queries/trainingPlan";

export const Route = createFileRoute(
  "/app/_authed/$clubSlug/players/$playerId/training/plan",
)({
  staticData: { section: "drills", crumbs: PLAYER_CRUMBS },
  beforeLoad: ({ context, params }) => {
    if (context.player.id !== Number(params.playerId)) {
      throw redirect({ to: "/app/$clubSlug/players/$playerId", params });
    }
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      trainingPlanQuery(Number(params.playerId)),
    ),
  component: TrainingPlanPage,
});
