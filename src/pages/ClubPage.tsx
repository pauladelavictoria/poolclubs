import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import { LuCheck, LuCopy, LuUserMinus, LuPencil, LuPlus } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useClubMembers, useManageClub } from "@/hooks/useClub";
import { useManagePlayers } from "@/hooks/useManagePlayers";
import PageHeader from "@/components/PageHeader";
import PlayerForm from "@/components/PlayerForm";
import ClubLogoUpload from "@/components/ClubLogoUpload";
import ClubThemePicker from "@/components/ClubThemePicker";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button, IconButton } from "@/components/ui/Button";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useDialog } from "@/libs/useDialog";
import type { Player, Category, BallColor } from "@/types";
import { useT } from "@/i18n";

/**
 * The club's own page: settings, invites and the roster. Owner-only — other
 * members get a "send invite" button in the nav drawer instead, since the
 * roster and settings here are theirs to manage, not to browse.
 */
export default function ClubPage() {
  const { t } = useT();
  const { activeClub, isClubAdmin, player, user } = useAuth();
  const { data: members, isLoading } = useClubMembers();
  const { approveMember, removeMember, updateClub } = useManageClub();
  const { createPlayer, updatePlayer } = useManagePlayers();

  const [name, setName] = useState("");
  // undefined means "unchanged" for both — the settings form only sends what
  // the admin actually touched, in one Guardar rather than three saves.
  const [logoUrl, setLogoUrl] = useState<string | null | undefined>(
    undefined,
  );
  const [color, setColor] = useState<BallColor | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const dialogRef = useDialog(isModalOpen);

  if (!activeClub) return null;
  if (!isClubAdmin) return <Navigate to="/app" replace />;

  const link = `${window.location.origin}/app/join/${activeClub.join_code}`;
  const pending = (members ?? []).filter((m) => m.status === "pending");
  const active = (members ?? []).filter((m) => m.status === "active");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked outside a secure context; the input is selectable.
      toast.error(t("club.copyError"));
    }
  };

  const closeModal = () => {
    setEditingPlayer(null);
    setIsModalOpen(false);
  };

  const hasChanges =
    name.trim().length > 0 || logoUrl !== undefined || color !== undefined;

  const saveSettings = () => {
    updateClub.mutate(
      {
        ...(name.trim() && { name: name.trim() }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(color !== undefined && { themeColor: color }),
      },
      {
        onSuccess: () => {
          setName("");
          setLogoUrl(undefined);
          setColor(undefined);
          toast.success(t("common.saved"));
        },
        onError: () => toast.error(t("common.error")),
      },
    );
  };

  const savePlayer = async (values: { name: string; category: Category }) => {
    try {
      if (editingPlayer) {
        await updatePlayer.mutateAsync({ id: editingPlayer.id, ...values });
        toast.success(t("players.updated"));
      } else {
        await createPlayer.mutateAsync(values);
        toast.success(t("players.created"));
      }
      closeModal();
    } catch {
      // Logged by the mutation cache; this is the part the user sees.
      toast.error(
        t(editingPlayer ? "players.updateError" : "players.createError"),
      );
    }
  };

  return (
    <>
      <PageHeader
        title={activeClub.name}
        subtitle={t("club.membersCount", {
          n: active.length,
        })}
      />
      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        <Card className="overflow-hidden">
          <CardHeader title={t("club.settings")} />
          <form
            className="p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!hasChanges) return;
              saveSettings();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="rename">{t("club.rename")}</Label>
              <Input
                id="rename"
                value={name}
                maxLength={60}
                placeholder={activeClub.name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="mt-5 space-y-1.5 border-t border-hairline pt-4">
              <Label>{t("club.branding.logoTitle")}</Label>
              <ClubLogoUpload
                name={activeClub.name}
                url={logoUrl !== undefined ? logoUrl : activeClub.logo_url}
                onChange={setLogoUrl}
                disabled={updateClub.isPending}
              />
            </div>

            <div className="mt-5 space-y-3 border-t border-hairline pt-4">
              <Label>{t("club.branding.colorTitle")}</Label>
              <p className="text-body text-ink-soft">
                {t("club.branding.colorHint")}
              </p>
              <ClubThemePicker
                value={color ?? activeClub.theme_color}
                onChange={setColor}
                disabled={updateClub.isPending}
              />
            </div>

            <Button
              type="submit"
              variant="secondary"
              className="mt-5"
              disabled={!hasChanges || updateClub.isPending}
            >
              {t("common.save")}
            </Button>
          </form>
        </Card >

        <Card className="overflow-hidden">
          <CardHeader title={t("club.inviteTitle")} />
          <div className="space-y-2 p-5">
            <p className="text-body text-ink-soft">{t("club.inviteHint")}</p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                className="font-mono"
                aria-label={t("club.inviteTitle")}
              />
              <Button variant="secondary" onClick={copy} className="shrink-0">
                {copied ? (
                  <LuCheck className="h-4 w-4" aria-hidden />
                ) : (
                  <LuCopy className="h-4 w-4" aria-hidden />
                )}
                {copied ? t("club.copied") : t("club.copy")}
              </Button>
            </div>
          </div>
        </Card>

        {
          pending.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader title={t("club.pendingTitle")} />
              <ul className="divide-y divide-hairline">
                {pending.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-body text-ink">
                      {m.name}
                    </span>
                    <Button
                      size="sm"
                      onClick={() =>
                        approveMember.mutate(m.id, {
                          onError: () => toast.error(t("common.error")),
                        })
                      }
                    >
                      {t("club.approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        removeMember.mutate(m.id, {
                          onError: () => toast.error(t("common.error")),
                        })
                      }
                    >
                      {t("club.reject")}
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )
        }

        {/* The roster lives here rather than on its own page: adding a guest
            player and approving a member are the same job. */}
        <Card className="overflow-hidden">
          <CardHeader
            title={t("club.membersTitle")}
            action={
              user && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingPlayer(null);
                    setIsModalOpen(true);
                  }}
                >
                  <LuPlus className="h-4 w-4" aria-hidden />
                  {t("players.add")}
                </Button>
              )
            }
          />
          {isLoading ? (
            <div className="p-3">
              <SkeletonRows rows={4} />
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {active.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate text-body text-ink">
                    <Link
                      to={`/app/players/${m.id}`}
                      className="hover:text-strike hover:underline"
                    >
                      {m.name}
                    </Link>
                    {m.id === player?.id && (
                      <span className="ml-2 text-caption text-ink-faint">
                        {t("club.you")}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-caption text-ink-faint">
                    {activeClub.owner_id === m.user_id
                      ? t("club.owner")
                      : t("category.short", { n: m.category })}
                  </span>
                  {user && (
                    <IconButton
                      label={t("players.editNamed", { name: m.name })}
                      onClick={() => {
                        setEditingPlayer(m);
                        setIsModalOpen(true);
                      }}
                    >
                      <LuPencil className="h-[18px] w-[18px]" />
                    </IconButton>
                  )}
                  {/* Removing takes their games and drill logs with them, so it
                      asks first. */}
                  {m.id !== player?.id && (
                    <IconButton
                      label={t("club.removeNamed", { name: m.name })}
                      size="sm"
                      tone="danger"
                      onClick={() => {
                        if (!confirm(t("club.removeConfirm", { name: m.name })))
                          return;
                        removeMember.mutate(m.id, {
                          onError: () => toast.error(t("common.error")),
                        });
                      }}
                    >
                      <LuUserMinus className="h-4 w-4" aria-hidden />
                    </IconButton>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div >

      {/* Native <dialog>, like the nav drawer: backdrop, Esc and focus trap come
          free. A bottom sheet on phones, a centred card from sm up. */}
      <dialog
        ref={dialogRef}
        className="sheet m-0 mt-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-sheet border border-hairline bg-felt p-5 text-ink sm:m-auto sm:rounded-sheet"
        aria-label={editingPlayer ? t("players.edit") : t("players.add")}
        onClose={closeModal}
        onClick={(e) => {
          if (e.target === dialogRef.current) closeModal();
        }}
      >
        <h2 className="mb-4 text-h3 font-semibold text-ink">
          {editingPlayer ? t("players.edit") : t("players.add")}
        </h2>
        {/* Mounted only while open, so the form starts empty every time rather
            than showing what the last edit typed. */}
        {
          isModalOpen && (
            <PlayerForm
              initialValues={
                editingPlayer
                  ? {
                    name: editingPlayer.name,
                    category: editingPlayer.category,
                  }
                  : undefined
              }
              onSubmit={savePlayer}
              onCancel={closeModal}
              isSubmitting={createPlayer.isPending || updatePlayer.isPending}
            />
          )
        }
      </dialog >
    </>
  );
}
