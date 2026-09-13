import { useState } from "react";
import { toast } from "react-toastify";
import { LuPlug, LuTrash2, LuUnplug, LuYoutube } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useClubTables } from "@/hooks/useClubTables";
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
import { Select } from "@/components/ui/Select";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useT } from "@/i18n";

/**
 * Connect the club's YouTube channel and map cameras to tables — one
 * reusable stream key per table, pasted into OBS once — see
 * docs/youtube-streaming.md §2.6.
 */
export default function ClubYoutubeCard() {
  const { t } = useT();
  const { activeClub } = useAuth();
  const { data: connection, isLoading: connectionLoading } =
    useYoutubeConnection();
  const { data: streams, isLoading: streamsLoading } = useClubStreams();
  const { data: tables } = useClubTables();
  const { disconnect, createStream, deleteStream } = useManageClubYoutube();

  const [tableId, setTableId] = useState("");
  const [label, setLabel] = useState("");
  // Shown once, right after creation — neither the address nor the key is
  // readable again after this (youtube.functions.ts never returns
  // stream_key_enc decrypted from listClubStreams).
  const [justCreated, setJustCreated] = useState<{
    ingestionAddress: string;
    streamKey: string;
  } | null>(null);

  const unmappedTables = (tables ?? []).filter(
    (table) => !(streams ?? []).some((s) => s.table_id === table.id),
  );

  const add = () => {
    const id = Number(tableId);
    const trimmed = label.trim();
    if (!id || !trimmed) return;
    createStream.mutate(
      { tableId: id, label: trimmed },
      {
        onSuccess: (result) => {
          setJustCreated(result);
          setTableId("");
          setLabel("");
        },
        onError: () => toast.error(t("common.error")),
      },
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader title={t("club.youtube.title")} />
      <div className="space-y-4 p-4">
        <p className="text-caption text-ink-faint">{t("club.youtube.hint")}</p>

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

        {connection && (
          <>
            {streamsLoading ? (
              <SkeletonRows />
            ) : (
              <ul className="divide-y divide-hairline">
                {(streams ?? []).map((stream) => {
                  const table = (tables ?? []).find(
                    (tb) => tb.id === stream.table_id,
                  );
                  return (
                    <li
                      key={stream.id}
                      className="flex items-center justify-between gap-2 py-2"
                    >
                      <span className="text-body text-ink">
                        {table?.label ?? stream.table_id} — {stream.label}
                      </span>
                      <IconButton
                        label={t("common.delete")}
                        tone="danger"
                        onClick={() => {
                          if (
                            !confirm(t("club.youtube.removeStreamConfirm"))
                          )
                            return;
                          deleteStream.mutate(stream.id, {
                            onError: () => toast.error(t("common.error")),
                          });
                        }}
                      >
                        <LuTrash2 className="h-4 w-4" aria-hidden />
                      </IconButton>
                    </li>
                  );
                })}
              </ul>
            )}

            {unmappedTables.length > 0 && (
              <div className="flex flex-wrap items-end gap-2 border-t border-hairline pt-3">
                <div className="min-w-40 flex-1">
                  <Label htmlFor="youtube-stream-table">
                    {t("club.youtube.table")}
                  </Label>
                  <Select
                    id="youtube-stream-table"
                    value={tableId}
                    onChange={(e) => setTableId(e.target.value)}
                  >
                    <option value="" disabled>
                      {t("club.youtube.tablePlaceholder")}
                    </option>
                    {unmappedTables.map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="min-w-40 flex-1">
                  <Label htmlFor="youtube-stream-label">
                    {t("club.youtube.streamLabel")}
                  </Label>
                  <Input
                    id="youtube-stream-label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={t("club.youtube.streamLabelPlaceholder")}
                    maxLength={60}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={add}
                  disabled={!tableId || !label.trim() || createStream.isPending}
                >
                  {t("club.youtube.addStream")}
                </Button>
              </div>
            )}

            {justCreated && (
              <div className="space-y-2 rounded-card border border-hairline bg-felt-raised p-3">
                <p className="text-caption font-semibold text-ink">
                  {t("club.youtube.showOnceWarning")}
                </p>
                <div>
                  <Label>{t("club.youtube.ingestUrl")}</Label>
                  <Input readOnly value={justCreated.ingestionAddress} />
                </div>
                <div>
                  <Label>{t("club.youtube.streamKey")}</Label>
                  <Input readOnly value={justCreated.streamKey} />
                </div>
                <Button size="sm" onClick={() => setJustCreated(null)}>
                  {t("club.youtube.gotIt")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
