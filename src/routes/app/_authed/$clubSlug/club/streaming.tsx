import { createFileRoute } from "@tanstack/react-router";
import ClubObsCard from "@/components/club/ClubObsCard";
import ClubYoutubeCard from "@/components/club/ClubYoutubeCard";

/** Recording and streaming — the OBS scene collection every camera-equipped
 *  club downloads once, and the YouTube channel + per-table stream keys that
 *  feed it. Its own tab, split out of Tables: this is a one-time setup task
 *  for the (typically one) camera-owning admin, not something read every
 *  time someone is just renaming a table. No page wrapper of its own — the
 *  parent layout (club/route.tsx) already spaces its children. */
export const Route = createFileRoute("/app/_authed/$clubSlug/club/streaming")({
  component: ClubStreamingTab,
});

function ClubStreamingTab() {
  return (
    <>
      <ClubObsCard />
      <ClubYoutubeCard />
    </>
  );
}
