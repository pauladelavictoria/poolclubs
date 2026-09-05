import { useState } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { toast } from "react-toastify";
import PageTitle from "@/components/layout/PageTitle";
import AvatarUpload from "@/components/players/AvatarUpload";
import PushToggle from "@/components/players/PushToggle";
import { useAuth } from "@/hooks/useAuth";
import { usePlayers } from "@/hooks/usePlayers";
import { useManagePlayers } from "@/hooks/useManagePlayers";
import { useLeaveClub } from "@/hooks/useClub";
import { dbErrorMessage } from "@/libs/algorithms/dbError";
import { changePassword } from "@/libs/server/auth.functions";
import { Card, CardHeader } from "@/components/ui/Card";
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

  const { user, refreshMemberships, activeClub, activeClubId, isClubAdmin } =
    useAuth();
  const { data: players, isLoading: isLoadingPlayers } = usePlayers();
  const player = players?.find((p) => p.id === playerIdNum);
  const { updatePlayer } = useManagePlayers();
  const leaveClub = useLeaveClub();

  // Synced from `player` on load, then left alone — an in-flight edit
  // shouldn't be clobbered by a background refetch of the same row.
  const [name, setName] = useState("");
  const [syncedId, setSyncedId] = useState<number | null>(null);
  if (player && syncedId !== player.id) {
    setSyncedId(player.id);
    setName(player.name);
  }

  const [password, setPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // These are private settings — only their owner can reach this page, which the
  // route's beforeLoad enforces before anything renders.

  const trimmed = name.trim();
  const dirty = !!player && trimmed !== player.name;

  const saveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!player || !trimmed || !dirty) return;

    updatePlayer.mutate(
      { id: player.id, personId: player.person_id, name: trimmed },
      {
        onSuccess: async () => {
          toast.success(t("players.updated"));
          await refreshMemberships();
        },
        // No name-clash branch any more: names stopped being unique per club
        // when they moved to people. Two members can share one, and the slug
        // keeps their profiles apart.
        onError: (err) =>
          toast.error(
            t(
              dbErrorMessage(err, "updatePlayer", {
                denied: "common.deniedError",
                fallback: "players.updateError",
              }),
            ),
          ),
      },
    );
  };

  /**
   * Listed or not, saved the moment it is flipped.
   *
   * One boolean with nothing to review and nothing to get half-right, so it
   * takes effect on change like the notifications switch above it rather than
   * waiting behind a Save button that would be the only thing on this card.
   */
  const savePublic = (next: boolean) => {
    if (!player) return;
    updatePlayer.mutate(
      { id: player.id, personId: player.person_id, is_public: next },
      {
        onError: (err) =>
          toast.error(
            t(
              dbErrorMessage(err, "updatePlayer", {
                denied: "common.deniedError",
                fallback: "players.updateError",
              }),
            ),
          ),
      },
    );
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setSavingPassword(true);
    try {
      const result = await changePassword({ data: { password } });
      if (result?.error) {
        toast.error(t("auth.passwordChangeError"));
        return;
      }
      setPassword("");
      toast.success(t("players.passwordUpdated"));
    } catch {
      toast.error(t("auth.passwordChangeError"));
    } finally {
      setSavingPassword(false);
    }
  };

  // The middle crumb is the player, so it is named by the player once they
  // have loaded rather than by the route's generic label.
  const title = <PageTitle title={t("players.accountSettings")} crumbs={[]} />;

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

  // A tablet bolted to a table is an anonymous Supabase user: no address to
  // show and no password to change. The whole account card is for people.
  const hasAccount = !!user?.email;

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
      {title}

      <Card className="overflow-hidden">
        <CardHeader title={t("players.profileTitle")} />
        <div className="space-y-4 p-5">
          {/* Saves itself the moment a file is picked — there is no version of
              a cropped photo worth holding back behind a button. */}
          <AvatarUpload name={player.name} url={player.avatar_url} />

          <form
            onSubmit={saveName}
            className="space-y-3 border-t border-hairline pt-4"
          >
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
        </div>
      </Card>

      {hasAccount && (
        <Card className="overflow-hidden">
          <CardHeader title={t("players.accountTitle")} />
          <div className="space-y-4 p-5">
            {/* Text, not a disabled input: there is nothing to type here, and a
                greyed-out field reads like something that ought to work. */}
            <div className="space-y-1.5">
              <Label>{t("players.email")}</Label>
              <p className="text-body text-ink">{user.email}</p>
            </div>

            {/* Nothing to change when there is no password to change. Supabase
                would happily take one and bolt an email identity onto a Google
                account, which is how a single sign-in turns into two without
                anyone deciding it should — so the field is not there to press.
                See `hasPassword` in libs/server/auth.functions.ts. */}
            {user.hasPassword ? (
              // No current-password step, because there is nothing for one to
              // defend: this only ever reaches the caller's own account, and
              // whoever is here already holds the session that could change it
              // from the recovery page anyway.
              <form
                onSubmit={savePassword}
                className="space-y-3 border-t border-hairline pt-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">
                    {t("players.changePassword")}
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    maxLength={200}
                    autoComplete="new-password"
                    placeholder={t("auth.newPassword")}
                    disabled={savingPassword}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={!password || savingPassword}
                  >
                    {savingPassword
                      ? t("common.saving")
                      : t("auth.savePassword")}
                  </Button>
                </div>
              </form>
            ) : (
              <p className="border-t border-hairline pt-4 text-body text-ink-soft">
                {t("players.signedInWithGoogle")}
              </p>
            )}
          </div>
        </Card>
      )}

      <PushToggle />

      {/* Said in full rather than as "public profile": the two halves of what
          this does are easy to get wrong, and getting it wrong is the
          difference between being findable and being hidden. */}
      <Card className="p-4">
        <Toggle
          checked={player.is_public}
          onChange={savePublic}
          label={t("players.publicProfile")}
          hint={t("players.publicProfileHint")}
          disabled={updatePlayer.isPending}
        />
        {player.is_public && (
          <Link
            to="/players/$playerSlug"
            params={{ playerSlug: player.slug }}
            className="mt-2 inline-block pl-7 text-caption font-medium text-strike transition-colors duration-150 hover:text-strike-light"
          >
            {t("players.viewPublicProfile")}
          </Link>
        )}
      </Card>

      {/* Not offered to the owner: leave_club refuses them, because a club whose
          owner has walked out has nobody who can approve anybody. Better absent
          than present and always failing. */}
      {!isClubAdmin && activeClub && (
        <Card className="p-4">
          <p className="text-body font-medium text-ink">
            {t("club.leaveTitle")}
          </p>
          <p className="mt-1 text-body text-ink-faint">
            {t("club.leaveHint")}
          </p>
          <div className="mt-4 flex justify-end">
            <Button
              variant="secondary"
              className="text-accent-red"
              disabled={leaveClub.isPending}
              onClick={() => {
                if (!confirm(t("club.leaveConfirm", { club: activeClub.name })))
                  return;
                leaveClub.mutate(activeClubId, {
                  onSuccess: () =>
                    toast.success(t("club.leftToast", { club: activeClub.name })),
                  onError: (err) =>
                    toast.error(
                      t(
                        dbErrorMessage(err, "leaveClub", {
                          denied: "common.deniedError",
                          refused: "club.leaveOwnerError",
                        }),
                      ),
                    ),
                });
              }}
            >
              {leaveClub.isPending ? t("common.saving") : t("club.leave")}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
