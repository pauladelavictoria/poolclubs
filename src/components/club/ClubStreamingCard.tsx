import { useState } from "react";
import { toast } from "react-toastify";
import {
  LuDownload,
  LuEye,
  LuEyeOff,
  LuPlug,
  LuTrash2,
  LuUnplug,
  LuYoutube,
} from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import {
  useClubTableCameras,
  useClubTables,
  useManageClubTables,
} from "@/hooks/useClubTables";
import {
  useYoutubeConnection,
  useClubStreams,
  useManageClubYoutube,
} from "@/hooks/useClubYoutube";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useT } from "@/i18n";

type ScriptPlatform = "windows" | "unix";

/** Same regex-on-userAgent, SSR-guarded approach as useInstallPrompt's
 *  isIOS — a heuristic for which download to put first, not a gate: it
 *  reads the browser's own OS, which is often not the OBS machine's (an
 *  admin can easily be setting this up from a phone or a different
 *  computer), so both options always stay visible either way. Phones
 *  excluded on purpose — neither script is ever the right one for one. */
function detectScriptPlatform(): ScriptPlatform | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/android|iphone|ipad|ipod/i.test(ua)) return null;
  if (/windows/i.test(ua)) return "windows";
  if (/mac os x|macintosh|linux/i.test(ua)) return "unix";
  return null;
}

const SCRIPTS: {
  id: ScriptPlatform;
  href: string;
  labelKey:
    "club.streaming.findCamerasWindows" | "club.streaming.findCamerasMac";
  command: string;
}[] = [
  {
    id: "windows",
    href: "/find-cameras.ps1",
    labelKey: "club.streaming.findCamerasWindows",
    command: "powershell -ExecutionPolicy Bypass -File find-cameras.ps1",
  },
  {
    id: "unix",
    href: "/find-cameras.sh",
    labelKey: "club.streaming.findCamerasMac",
    command: "bash find-cameras.sh",
  },
];

/**
 * Camera URL and YouTube stream, one row per table — a single admin-facing
 * concern (what feeds this table's OBS scene) even though they're two
 * different admin-only DB tables under the hood (club_table_cameras,
 * club_streams — see useClubTableCameras for why the camera URL isn't a
 * club_tables column). Was two separate cards; merged because setting one up
 * without the other in view was the confusing part, not either field itself.
 *
 * "Start streaming" only ever needs a manual click for the rare table where
 * auto-provisioning didn't run or failed — see createClubStream's own
 * comment for the normal, automatic path (saving a camera_url while
 * connected, or the OAuth callback's backfill).
 */
export default function ClubStreamingCard() {
  const { t } = useT();
  const { activeClub } = useAuth();
  // Lazy initializer, not an effect: this reads a synchronous browser API at
  // mount, same as useInstallPrompt's `installed` state. Guarded for SSR.
  const [scriptPlatform] = useState(detectScriptPlatform);
  const orderedScripts =
    scriptPlatform === null
      ? SCRIPTS
      : [...SCRIPTS].sort((a) => (a.id === scriptPlatform ? -1 : 1));
  const { data: tables, isLoading: tablesLoading } = useClubTables();
  const { data: cameras, isLoading: camerasLoading } = useClubTableCameras();
  const { updateTableCamera } = useManageClubTables();
  const { data: connection, isLoading: connectionLoading } =
    useYoutubeConnection();
  const { data: streams } = useClubStreams();
  const { disconnect, createStream, deleteStream, revealStream } =
    useManageClubYoutube();

  // The key/URL currently shown inline, for whichever stream that is — one
  // at a time, closed by re-fetching it fresh rather than kept in state.
  const [revealed, setRevealed] = useState<{
    streamId: number;
    ingestionAddress: string;
    streamKey: string;
  } | null>(null);

  const streamByTableId = new Map((streams ?? []).map((s) => [s.table_id, s]));

  const toggleReveal = (streamId: number) => {
    if (revealed?.streamId === streamId) {
      setRevealed(null);
      return;
    }
    revealStream.mutate(streamId, {
      onSuccess: (result) => setRevealed({ streamId, ...result }),
      onError: () => toast.error(t("common.error")),
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader title={t("club.streaming.title")} />
      <div className="space-y-4 p-4">
        <p className="text-caption text-ink-faint">
          {t("club.streaming.hint")}
        </p>

        {/* Two static files in public/, not a component or a server route:
            a generic network scanner, nothing club-specific to fill in. One
            script per platform rather than one Node script for both — the
            OBS PC is usually Windows (dshow_input, the placeholder camera
            source's default, is Windows-only) and ships PowerShell with no
            install; the .sh covers the Linux mini PCs the ops runbook also
            allows, using only bash builtins so nothing to install there
            either. */}
        <div className="space-y-2 rounded-card bg-felt-raised p-3">
          <p className="text-caption text-ink-faint">
            {t("club.streaming.findCamerasHint")}
          </p>
          {orderedScripts.map((script) => {
            const isDetected = script.id === scriptPlatform;
            return (
              <div
                key={script.id}
                className="flex flex-wrap items-center gap-2"
              >
                <a
                  href={script.href}
                  download
                  className={buttonClasses({
                    variant: isDetected ? "primary" : "secondary",
                    size: "sm",
                  })}
                >
                  <LuDownload className="h-4 w-4" aria-hidden />
                  {t(script.labelKey)}
                </a>
                <code className="font-mono text-caption text-ink">
                  {script.command}
                </code>
              </div>
            );
          })}
        </div>

        {connectionLoading ? (
          <SkeletonRows />
        ) : connection ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-card bg-felt-raised p-3">
            <span className="flex items-center gap-2 text-body text-ink">
              <LuYoutube className="h-4 w-4 shrink-0" aria-hidden />
              {t("club.youtube.connectedAs", {
                channel: connection.channel_title,
              })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!confirm(t("club.youtube.disconnectConfirm"))) return;
                disconnect.mutate(undefined, {
                  onError: () => toast.error(t("common.error")),
                });
              }}
              disabled={disconnect.isPending}
            >
              <LuUnplug className="h-4 w-4" aria-hidden />
              {t("club.youtube.disconnect")}
            </Button>
          </div>
        ) : (
          <a
            href={`/api/youtube/connect?club=${activeClub.slug}`}
            className={buttonClasses({ size: "sm" })}
          >
            <LuPlug className="h-4 w-4" aria-hidden />
            {t("club.youtube.connect")}
          </a>
        )}

        {tablesLoading || camerasLoading ? (
          <SkeletonRows />
        ) : (
          <div>
            {/* Column headers only make sense once the row itself is a row
                — hidden below sm, where each table stacks as its own block
                and the input's own placeholder/label carries the meaning. */}
            <div className="hidden gap-2 px-0.5 text-caption font-medium text-ink-faint sm:flex">
              <span className="w-24 shrink-0">{t("club.streaming.table")}</span>
              <span className="min-w-40 flex-1">
                {t("club.streaming.cameraUrl")}
              </span>
              <span className="w-44 shrink-0 text-right">
                {t("club.streaming.youtubeStream")}
              </span>
            </div>
            <ul className="divide-y divide-hairline">
              {(tables ?? []).map((table) => {
                const cameraUrl = cameras?.get(table.id) ?? "";
                const stream = streamByTableId.get(table.id);
                const isRevealed = revealed?.streamId === stream?.id;

                return (
                  <li key={table.id} className="space-y-2 py-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <span className="text-body font-medium text-ink sm:w-24 sm:shrink-0 sm:truncate sm:font-normal">
                        {table.label}
                      </span>
                      <div className="w-full sm:contents">
                        <Label
                          htmlFor={`table-camera-${table.id}`}
                          className="sm:hidden"
                        >
                          {t("club.streaming.cameraUrl")}
                        </Label>
                        <Input
                          id={`table-camera-${table.id}`}
                          defaultValue={cameraUrl}
                          placeholder={t("club.cameras.urlPlaceholder")}
                          maxLength={500}
                          className="w-full sm:min-w-40 sm:flex-1"
                          onBlur={(e) => {
                            const next = e.target.value.trim();
                            if (next === cameraUrl) return;
                            updateTableCamera.mutate(
                              { id: table.id, cameraUrl: next || null },
                              {
                                onSuccess: () => {
                                  if (!next || !connection || stream) return;
                                  createStream.mutate(
                                    { tableId: table.id, label: table.label },
                                    {
                                      onSuccess: () =>
                                        toast.success(
                                          t("club.cameras.streamStarted", {
                                            name: table.label,
                                          }),
                                        ),
                                      // Best-effort: the camera is saved either
                                      // way, and "Start streaming" below is still
                                      // there to retry.
                                      onError: () => {},
                                    },
                                  );
                                },
                              },
                            );
                          }}
                        />
                      </div>
                      <div className="w-full sm:contents">
                        <Label className="sm:hidden">
                          {t("club.streaming.youtubeStream")}
                        </Label>
                        <div className="flex w-full items-center gap-1 sm:w-44 sm:shrink-0 sm:justify-end">
                          {!cameraUrl ? (
                            <span className="text-caption text-ink-faint">
                              {t("club.streaming.needsCamera")}
                            </span>
                          ) : !connection ? null : stream ? (
                            <>
                              <IconButton
                                label={
                                  isRevealed
                                    ? t("club.youtube.hideKey")
                                    : t("club.youtube.showKey")
                                }
                                onClick={() => toggleReveal(stream.id)}
                                disabled={revealStream.isPending}
                              >
                                {isRevealed ? (
                                  <LuEyeOff className="h-4 w-4" aria-hidden />
                                ) : (
                                  <LuEye className="h-4 w-4" aria-hidden />
                                )}
                              </IconButton>
                              <IconButton
                                label={t("common.delete")}
                                tone="danger"
                                onClick={() => {
                                  if (
                                    !confirm(
                                      t("club.youtube.removeStreamConfirm"),
                                    )
                                  )
                                    return;
                                  if (isRevealed) setRevealed(null);
                                  deleteStream.mutate(stream.id, {
                                    onError: () =>
                                      toast.error(t("common.error")),
                                  });
                                }}
                              >
                                <LuTrash2 className="h-4 w-4" aria-hidden />
                              </IconButton>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                createStream.mutate(
                                  { tableId: table.id, label: table.label },
                                  {
                                    onError: () =>
                                      toast.error(t("common.error")),
                                  },
                                )
                              }
                              disabled={createStream.isPending}
                            >
                              {t("club.youtube.startStreaming")}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {isRevealed && revealed && (
                      <div className="space-y-2 rounded-card border border-hairline bg-felt-raised p-3">
                        <div>
                          <Label>{t("club.youtube.ingestUrl")}</Label>
                          <Input readOnly value={revealed.ingestionAddress} />
                        </div>
                        <div>
                          <Label>{t("club.youtube.streamKey")}</Label>
                          <Input readOnly value={revealed.streamKey} />
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
