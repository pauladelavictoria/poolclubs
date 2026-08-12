import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import PageHeader from "@/components/PageHeader";
import PlayerTabs from "@/components/PlayerTabs";
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

export default function PlayerSettingsPage() {
  const { t } = useT();
  const { playerId } = useParams<{ playerId: string }>();
  const playerIdNum = Number(playerId);

  const {
    player: authPlayer,
    isLoading: isAuthLoading,
    refreshMemberships,
  } = useAuth();
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

  // These are private settings — only their owner can reach this page.
  if (!isAuthLoading && authPlayer?.id !== playerIdNum) {
    return <Navigate to={`/app/players/${playerIdNum}`} replace />;
  }

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

  const header = (
    <PageHeader
      title={t("players.accountSettings")}
      subtitle={player?.name}
      back={`/app/players/${playerIdNum}`}
    />
  );

  if (isLoadingPlayers) {
    return (
      <>
        {header}
        <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-40 w-full rounded-card" />
        </div>
      </>
    );
  }

  if (!player) return null;

  return (
    <>
      {header}

      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        <PlayerTabs playerId={player.id} isOwnProfile />

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
