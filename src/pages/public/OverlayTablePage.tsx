import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import OverlayScoreboard from "@/components/live/OverlayScoreboard";
import { publicClubRosterQuery } from "@/queries/public/clubs";
import { publicLiveMatchByTableQuery } from "@/queries/public/live";
import { wantedMatch } from "@/libs/algorithms/streamSession";

const route = getRouteApi("/overlay/table/$clubSlug/$tableId");

/** Kept streaming this long after a recorded match ends: a rematch within it
 *  never drops the connection, and the reconciler (once a minute) has
 *  completed the old broadcast before the encoder goes away. */
const STOP_AFTER_MS = 2 * 60_000;

/** What obs-browser puts on `window` for a source whose page permission is
 *  "Full access" (obsSceneCollection.ts sets it). Absent in a normal browser. */
type ObsStudio = { startStreaming(): void; stopStreaming(): void };

/**
 * Whatever is live on one table right now — see
 * docs/youtube-streaming.md Phase 1. This is the URL a pre-generated OBS
 * scene points at, so it never 404s: a bad slug, a private club, an idle
 * table and a bad table id all render the same transparent nothing, which is
 * exactly what a camera bolted to a table should show between racks.
 */
export default function OverlayTablePage() {
  const { clubSlug, tableId } = route.useParams();
  const id = Number(tableId);
  const valid = Number.isInteger(id) && id > 0;

  const { data: live } = useQuery({
    ...publicLiveMatchByTableQuery(clubSlug, id),
    enabled: valid,
  });
  // Inside OBS, this page decides when its instance uploads: only while the
  // table's match is going to be recorded (wantedMatch, the same rule the
  // reconciler uses to open a broadcast). Starting an already-running stream
  // is a no-op in OBS, so a refetch re-running this is harmless.
  const recording = wantedMatch(live ?? null) !== null;
  useEffect(() => {
    const obs = (window as { obsstudio?: ObsStudio }).obsstudio;
    if (!obs) return;
    if (recording) {
      obs.startStreaming();
      return;
    }
    const timer = setTimeout(() => obs.stopStreaming(), STOP_AFTER_MS);
    return () => clearTimeout(timer);
  }, [recording]);

  const { data: roster } = useQuery({
    ...publicClubRosterQuery(live?.club_id ?? -1),
    enabled: !!live,
  });

  const style = <style>{`html,body{background:transparent}`}</style>;
  if (!live || !roster) return style;

  const entriesOf = (ids: (number | null)[]) =>
    ids
      .filter((pid): pid is number => pid !== null)
      .map((pid) => {
        const player = roster.find((p) => p.id === pid);
        return { name: player?.name ?? "—", country: player?.country ?? null };
      });

  return (
    <>
      {style}
      <OverlayScoreboard
        side1={{ entries: entriesOf([live.player_1_id, live.player_1b_id]) }}
        side2={{ entries: entriesOf([live.player_2_id, live.player_2b_id]) }}
        score1={live.player_1_score}
        score2={live.player_2_score}
        raceTo={live.race_to}
        discipline={live.discipline}
        lastSide={live.last_side}
        live
        club={{ slug: live.club.slug, name: live.club.name }}
      />
    </>
  );
}
