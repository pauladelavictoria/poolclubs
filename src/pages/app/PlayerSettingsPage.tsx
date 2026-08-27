import { useState } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { toast } from "react-toastify";
import PageTitle from "@/components/layout/PageTitle";
import AvatarUpload from "@/components/players/AvatarUpload";
import PushToggle from "@/components/players/PushToggle";
import { useAuth } from "@/hooks/useAuth";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useManagePlayers } from "@/hooks/useManagePlayers";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
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
  const [isPublic, setIsPublic] = useState(true);
  const [syncedId, setSyncedId] = useState<number | null>(null);
  if (player && syncedId !== player.id) {
    setSyncedId(player.id);
    setName(player.name);
    setIsPublic(player.is_public);
  }

  // These are private settings — only their owner can reach this page, which the
  // route's beforeLoad enforces before anything renders.

  const trimmed = name.trim();
  const dirty =
    !!player && (trimmed !== player.name || isPublic !== player.is_public);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!player || !trimmed || !dirty) return;

    updatePlayer.mutate(
      {
        id: player.id,
        personId: player.person_id,
        name: trimmed,
        is_public: isPublic,
      },
      {
        onSuccess: async () => {
          toast.success(t("players.updated"));
          await refreshMemberships();
        },
        // No name-clash branch any more: names stopped being unique per club
        // when they moved to people. Two members can share one, and the slug
        // keeps their profiles apart.
        onError: () => toast.error(t("players.updateError")),
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

            {/* Said in full rather than as "public profile": the two halves of
                what this does are easy to get wrong, and getting it wrong is
                the difference between being findable and being hidden. */}
            <div className="border-t border-hairline pt-3">
              <Toggle
                checked={isPublic}
                onChange={setIsPublic}
                label={t("players.publicProfile")}
                hint={t("players.publicProfileHint")}
                disabled={updatePlayer.isPending}
              />
              {isPublic && (
                <Link
                  to="/players/$playerSlug"
                  params={{ playerSlug: player.slug }}
                  className="mt-2 inline-block pl-7 text-caption font-medium text-strike transition-colors duration-150 hover:text-strike-light"
                >
                  {t("players.viewPublicProfile")}
                </Link>
              )}
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

        <PushToggle />
      </div>
    </>
  );
}
