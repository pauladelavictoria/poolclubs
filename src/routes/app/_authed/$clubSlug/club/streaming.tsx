import { createFileRoute } from "@tanstack/react-router";
import ClubStreamingCard from "@/components/club/ClubStreamingCard";
import ClubStreamerSetupCard from "@/components/club/ClubStreamerSetupCard";

/** Recording and streaming — which camera feeds which table and that
 *  table's YouTube stream key together (ClubStreamingCard), then the
 *  streaming computer's runbook — the OBS scene download and the club's own
 *  start-up scripts (ClubStreamerSetupCard). Its own tab, split out of Tables: this is a one-time setup task for the
 *  (typically one) camera-owning admin, not something read every time
 *  someone is just renaming a table. No page wrapper of its own — the
 *  parent layout (club/route.tsx) already spaces its children. */
export const Route = createFileRoute("/app/_authed/$clubSlug/club/streaming")({
  component: ClubStreamingTab,
});

function ClubStreamingTab() {
  return (
    <>
      <ClubStreamingCard />
      <ClubStreamerSetupCard />
    </>
  );
}
