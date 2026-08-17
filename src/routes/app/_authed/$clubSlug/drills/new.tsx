import { createFileRoute } from "@tanstack/react-router";
import DrillEditorPage from "@/pages/app/DrillEditorPage";

export const Route = createFileRoute("/app/_authed/$clubSlug/drills/new")({
  staticData: {
    section: "drills",
    crumbs: [{ labelKey: "drills.title", to: "/app/$clubSlug/drills" }],
  },
  component: DrillEditorPage,
});
