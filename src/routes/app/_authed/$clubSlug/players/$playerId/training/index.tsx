import { createFileRoute, redirect } from "@tanstack/react-router";
import TrainingProgressPage from "@/pages/TrainingProgressPage";
import { PLAYER_CRUMBS } from "@/libs/crumbs";
import { drillLogsQuery } from "@/queries/drills";

export const Route = createFileRoute(
  "/app/_authed/$clubSlug/players/$playerId/training/",
)({
  staticData: { section: "drills", crumbs: PLAYER_CRUMBS },
  beforeLoad: ({ context, params }) => {
    if (context.player.id !== Number(params.playerId)) {
      throw redirect({ to: "/app/$clubSlug/players/$playerId", params });
    }
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      drillLogsQuery({ player_id: Number(params.playerId) }),
    ),
  component: TrainingProgressPage,
});
