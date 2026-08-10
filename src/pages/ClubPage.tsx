import { useState } from "react";
import { toast } from "react-toastify";
import { LuCheck, LuCopy, LuUserMinus, LuPencil, LuPlus } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useClubMembers, useManageClub } from "@/hooks/useClub";
import { useManagePlayers } from "@/hooks/useManagePlayers";
import PageHeader from "@/components/PageHeader";
import PlayerForm from "@/components/PlayerForm";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button, IconButton } from "@/components/ui/Button";
import { SkeletonRows } from "@/components/ui/Skeleton";
import type { Player, Category } from "@/types";
import { useT } from "@/i18n";

/**
 * The club's own page: settings, invites and the roster. Everyone gets the
 * invite link — anyone may invite. Only the owner sees the approve/remove
 * controls, mirroring the RLS in sql/supabase-migration-clubs.sql.
 */
export default function ClubPage() {
  const { t } = useT();
  const { activeClub, isClubAdmin, player, user } = useAuth();
  const { data: members, isLoading } = useClubMembers();
  const { approveMember, removeMember, renameClub } = useManageClub();
  const { createPlayer, updatePlayer } = useManagePlayers();

  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  if (!activeClub) return null;

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
        {isClubAdmin && (
          <Card className="overflow-hidden">
            <CardHeader title={t("club.settings")} />
            <form
              className="space-y-3 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim()) return;
                renameClub.mutate(name, {
                  onSuccess: () => {
                    setName("");
                    toast.success(t("common.saved"));
                  },
                  onError: () => toast.error(t("common.error")),
                });
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
              <Button
                type="submit"
                variant="secondary"
                disabled={!name.trim() || renameClub.isPending}
              >
                {t("common.save")}
              </Button>
            </form>
          </Card>
        )}
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

        {isClubAdmin && pending.length > 0 && (
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
        )}

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
                    {m.name}
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
                  {isClubAdmin && m.id !== player?.id && (
                    <button
                      type="button"
                      aria-label={t("club.removeNamed", { name: m.name })}
                      className="shrink-0 rounded-control p-2 text-ink-ghost hover:bg-felt-raised hover:text-strike"
                      onClick={() => {
                        if (!confirm(t("club.removeConfirm", { name: m.name })))
                          return;
                        removeMember.mutate(m.id, {
                          onError: () => toast.error(t("common.error")),
                        });
                      }}
                    >
                      <LuUserMinus className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <div className="absolute inset-0" aria-hidden onClick={closeModal} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingPlayer ? t("players.edit") : t("players.add")}
            className="relative w-full max-w-md rounded-t-sheet border border-hairline bg-felt p-5 sm:rounded-sheet"
          >
            <h2 className="mb-4 text-h3 font-semibold text-ink">
              {editingPlayer ? t("players.edit") : t("players.add")}
            </h2>
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
          </div>
        </div>
      )}
    </>
  );
}
