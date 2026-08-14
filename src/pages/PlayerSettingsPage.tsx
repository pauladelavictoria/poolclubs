import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { toast } from "react-toastify";
import PageTitle from "@/components/PageTitle";
import AvatarUpload from "@/components/AvatarUpload";
import { useAuth } from "@/hooks/useAuth";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useManagePlayers } from "@/hooks/useManagePlayers";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useT } from "@/i18n";

const route = getRouteApi("/app/_authed/$clubSlug/players/$playerId/settings");

export default function PlayerSettingsPage() {
  const { t } = useT();
  const { playerId } = route.useParams();
  const playerIdNum = Number(playerId);

  const { refreshMemberships } = useAuth();
  const { data: players, isLoading: isLoadingPlayers } = useGetPlayers();
  const player = players?.find((p) => p.id === playerIdNum);
  const { updatePlayer } = useManagePlayers();

  // Synced from `player` on load, then left alone — an in-flight edit
  // shouldn't be clobbered by a background refetch of the same row.
  const [name, setName] = useState("");
  const [syncedId, setSyncedId] = useState<number | null>(null);
  if (player && syncedId !== player.id) {
    setSyncedId(player.id);
    setName(player.name);
  }

  // These are private settings — only their owner can reach this page, which the
  // route's beforeLoad enforces before anything renders.

  const trimmed = name.trim();
  const dirty = !!player && trimmed !== player.name;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!player || !trimmed || !dirty) return;

    updatePlayer.mutate(
      { id: player.id, name: trimmed },
      {
        onSuccess: async () => {
          toast.success(t("players.updated"));
          await refreshMemberships();
        },
        onError: (e) =>
          toast.error(
            t(
              (e as { code?: string })?.code === "23505"
                ? "players.nameTaken"
                : "players.updateError",
            ),
          ),
      },
    );
  };

  // The middle crumb is the player, so it is named by the player once they
  // have loaded rather than by the route's generic label.
  const title = (
    <PageTitle
      title={t("players.accountSettings")}
      crumbs={[]}
    />
  );

  if (isLoadingPlayers) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        {title}
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-40 w-full rounded-card" />
      </div>
    );
  }

  if (!player) return null;

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        {title}

        <Card className="p-4">
          <AvatarUpload name={player.name} url={player.avatar_url} />
        </Card>

        <Card className="p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="player-name">{t("players.name")}</Label>
              <Input
                id="player-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                required
                disabled={updatePlayer.isPending}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!dirty || !trimmed || updatePlayer.isPending}
              >
                {updatePlayer.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
