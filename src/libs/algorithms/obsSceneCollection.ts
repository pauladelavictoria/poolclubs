/**
 * Builds an OBS scene collection: one scene per table, a placeholder camera
 * source and a Browser Source already pointed at that table's overlay URL —
 * see docs/youtube-streaming.md Phase 1.5a.
 *
 * ponytail: no scene-collection schema library and no OBS SDK. This is a
 * nested object with a shape OBS has kept stable for years, built straight
 * from the table rows and serialized with JSON.stringify.
 *
 * Deliberately minimal rather than exhaustive: every field OBS itself would
 * also write on save is left out unless the doc's spec calls for it, and OBS
 * fills the rest in from its own defaults on import — trying to replicate
 * every field increases the odds of getting one of them subtly wrong.
 *
 * UNVERIFIED against a real OBS install — this repo has none to test against.
 * Before trusting this with a real club, do the doc's own round-trip check:
 * import the download into a clean OBS profile, export the collection back
 * out, and diff it against this generator's output.
 */

export type ObsSceneTable = { id: number; label: string };

/**
 * The Windows Video Capture Device source. Chosen as the default rather than
 * `av_capture_input` (macOS) or `ffmpeg_source` (RTSP): the ops runbook steers
 * clubs toward an NVENC/QuickSync mini PC, which is Windows or Linux, never a
 * Mac. A Linux or RTSP-camera club re-adds this one source under `v4l2_input`
 * or `ffmpeg_source` by hand — the same one manual step as picking the actual
 * device, which the doc already says the app cannot know.
 */
const CAMERA_SOURCE_ID = "dshow_input";

const OVERLAY_WIDTH = 1920;
const OVERLAY_HEIGHT = 1080;

type ObsSource = {
  id: string;
  name: string;
  settings: Record<string, unknown>;
  mixers: number;
  sync: number;
  flags: number;
  volume: number;
  balance: number;
  enabled: boolean;
  muted: boolean;
  hotkeys: Record<string, never>;
  deinterlace_mode: number;
  deinterlace_field_order: number;
  monitoring_type: number;
  private_settings: Record<string, never>;
};

const source = (
  id: string,
  name: string,
  settings: Record<string, unknown>,
): ObsSource => ({
  id,
  name,
  settings,
  mixers: 0,
  sync: 0,
  flags: 0,
  volume: 1,
  balance: 0.5,
  enabled: true,
  muted: false,
  hotkeys: {},
  deinterlace_mode: 0,
  deinterlace_field_order: 0,
  monitoring_type: 0,
  private_settings: {},
});

const sceneItem = (name: string, id: number) => ({
  name,
  id,
  pos: { x: 0, y: 0 },
  scale: { x: 1, y: 1 },
  rot: 0,
  align: 5,
  bounds_type: 0,
  bounds_align: 0,
  bounds: { x: 0, y: 0 },
  crop_top: 0,
  crop_bottom: 0,
  crop_left: 0,
  crop_right: 0,
  visible: true,
  locked: false,
  selected: false,
  group_item_backup: false,
  private_settings: {},
});

export function buildObsSceneCollection({
  clubName,
  clubSlug,
  tables,
  origin,
}: {
  clubName: string;
  clubSlug: string;
  tables: ObsSceneTable[];
  /** The scheme+host the overlay URLs point at — from the request that asked
   *  for this file, so a club on a preview deploy gets URLs that actually
   *  work rather than the production host. */
  origin: string;
}) {
  const sources = tables.flatMap((table) => {
    const cameraName = `${table.label} — Camera`;
    const overlayName = `${table.label} — Overlay`;

    const camera = source(CAMERA_SOURCE_ID, cameraName, {
      device_id: "",
      device_name: "",
    });

    const overlay = source("browser_source", overlayName, {
      url: `${origin}/overlay/table/${clubSlug}/${table.id}`,
      width: OVERLAY_WIDTH,
      height: OVERLAY_HEIGHT,
      shutdown: false,
      restart_when_active: true,
    });

    // The camera drawn first, the overlay on top — a Browser Source with a
    // transparent background composited over the feed, per Phase 1.
    const scene = source("scene", table.label, {
      id: "scene",
      custom_size: false,
      items: [sceneItem(cameraName, 1), sceneItem(overlayName, 2)],
    });

    return [camera, overlay, scene];
  });

  return {
    current_program_scene: tables[0]?.label ?? "",
    current_scene: tables[0]?.label ?? "",
    current_transition: "Fade",
    groups: [],
    modules: {},
    name: `${clubName} — PoolClubs`,
    preview_locked: false,
    quick_transitions: [],
    saved_projectors: [],
    scaling_enabled: false,
    scaling_level: 0,
    scaling_off_x: 0,
    scaling_off_y: 0,
    scene_order: tables.map((table) => ({ name: table.label })),
    sources,
    transition_duration: 300,
    transitions: [],
  };
}
