import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { toast } from "react-toastify";
import {
  LuCheck,
  LuCircleUser,
  LuCopy,
  LuPrinter,
  LuUserMinus,
  LuPencil,
  LuPlus,
} from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useClubMembers, useManageClub } from "@/hooks/useClub";
import { useManagePlayers } from "@/hooks/useManagePlayers";
import { runMutation } from "@/libs/browser/mutationToast";
import { dbErrorMessage } from "@/libs/algorithms/dbError";
import PlayerForm from "@/components/players/PlayerForm";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button, IconButton } from "@/components/ui/Button";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useDialog } from "@/hooks/useDialog";
import type { Player, Category } from "@/types";
import { useT } from "@/i18n";
import { AppLink } from "@/components/layout/AppLink";

/**
 * The way into the club, and everyone who took it.
 *
 * Pending join requests surface globally, see JoinRequestBanner — an admin
 * shouldn't have to be on this page to see one. The roster lives beside the
 * invite link rather than on its own page because adding a guest player and
 * approving a member are the same job.
 */
export default function ClubMembersPage() {
  const { t } = useT();
  const { activeClub, player, user } = useAuth();
  // The invite link needs an absolute URL, and `window` does not exist while the
  // page is being rendered on the server — so the request's own origin comes
  // down from the root route instead.
  const { origin } = getRouteApi("__root__").useRouteContext();
  const { data: members, isLoading } = useClubMembers();
  const { removeMember } = useManageClub();
  const { createPlayer, updatePlayer } = useManagePlayers();

  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const dialogRef = useDialog(isModalOpen);

  // Admin-only, enforced by the route's beforeLoad before this renders.

  const link = `${origin}/app/join/${activeClub.slug}`;
  // The tablet bolted to a table has a member row of its own — that is what
  // lets RLS accept a score from it — but it is a fixture, not a person. It is
  // listed and unpaired on the Tables tab, next to the table it belongs to, so
  // leaving it here would be a second copy that also offers to rename it and
  // hand it a division. Same filter, same reason, as the roster in
  // playersQuery (src/queries/players.ts).
  const active = (members ?? []).filter(
    (m) => m.status === "active" && !m.is_device,
  );

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
    const ok = editingPlayer
      ? await runMutation(
          updatePlayer.mutateAsync({
            id: editingPlayer.id,
            personId: editingPlayer.person_id,
            ...values,
          }),
          t,
          "players.updated",
          "players.updateError",
          { denied: "common.deniedError" },
        )
      : await runMutation(
          createPlayer.mutateAsync(values),
          t,
          "players.created",
          "players.createError",
          { denied: "common.deniedError" },
        );
    if (ok) closeModal();
  };

  return (
    <>
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

          <div className="border-t border-hairline pt-4">
            <AppLink
              to="/app/$clubSlug/invite/print"
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              <LuPrinter className="h-4 w-4" aria-hidden />
              {t("club.poster")}
            </AppLink>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          title={
            <span className="flex items-baseline gap-2">
              {t("club.membersTitle")}
              <span className="text-caption font-normal tabular-nums text-ink-faint">
                {active.length}
              </span>
            </span>
          }
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
                  <AppLink
                    to="/app/$clubSlug/players/$playerId"
                    params={{ playerId: m.id }}
                    className="transition-colors duration-150 hover:text-strike"
                  >
                    {m.name}
                  </AppLink>
                  {m.id === player?.id && (
                    <span className="ml-2 text-caption text-ink-faint">
                      {t("club.you")}
                    </span>
                  )}
                </span>
                {/* Who signed up and who was typed in by an admin. `user_id`
                    is the account link on the person — null means a guest,
                    someone who plays here but has never opened the app. Marked
                    on the ones who have an account rather than tagging every
                    guest, since the roster row is already three things wide. */}
                {m.user_id && (
                  <LuCircleUser
                    className="h-4 w-4 shrink-0 text-ink-faint"
                    role="img"
                    title={t("club.hasAccount")}
                  />
                )}
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
                        onError: (err) =>
                          toast.error(
                            t(
                              dbErrorMessage(err, "removeMember", {
                                denied: "common.deniedError",
                              }),
                            ),
                          ),
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

      {/* Native <dialog>, like the nav drawer: backdrop, Esc and focus trap come
          free. A bottom sheet on phones, a centred card from sm up. */}
      <dialog
        ref={dialogRef}
        className="sheet m-0 mt-auto max-h-[90dvh] w-full max-w-none sm:max-w-md overflow-y-auto rounded-t-sheet border border-hairline bg-felt p-5 text-ink sm:m-auto sm:rounded-sheet"
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
        {isModalOpen && (
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
        )}
      </dialog>
    </>
  );
}
