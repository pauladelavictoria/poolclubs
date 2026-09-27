import { useState } from "react";
import { LuPlus, LuNetwork } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useTournaments, useManageTournaments } from "@/hooks/useTournaments";
import { runMutation } from "@/libs/browser/mutationToast";
import PageTitle from "@/components/layout/PageTitle";
import TournamentForm, {
  type TournamentValues,
} from "@/components/tournaments/TournamentForm";
import { Card } from "@/components/ui/Card";
import { dialogClasses } from "@/components/ui/cardStyles";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/SkeletonRows";
import { useDialog, useLingering } from "@/hooks/useDialog";
import { type TournamentStatus } from "@/types";
import { useT, type Key } from "@/i18n";
import { TournamentEventCard } from "@/components/tournaments/TournamentEventCard";

/** Live first, then what you can still enter, then the archive. */
const GROUPS: { key: Key; statuses: TournamentStatus[] }[] = [
  { key: "tournaments.live", statuses: ["groups", "running"] },
  { key: "tournaments.openTitle", statuses: ["open"] },
  { key: "tournaments.finished", statuses: ["done"] },
];

export default function TournamentsPage() {
  const { t } = useT();
  const { isClubAdmin } = useAuth();
  const { data: tournaments, isLoading } = useTournaments();
  const { createTournament } = useManageTournaments();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const dialogRef = useDialog(isModalOpen);
  // Kept through the close animation — see useLingering.
  const shownIsModalOpen = useLingering(isModalOpen);

  const create = async (values: TournamentValues) => {
    const ok = await runMutation(
      createTournament.mutateAsync(values),
      t,
      "tournaments.created",
    );
    if (ok) setIsModalOpen(false);
  };

  const all = tournaments ?? [];

  return (
    <>
      {/* A draw sheet is a few big things pinned to a wall, not rows in a
          ledger — so the groups are separated by air rather than by a box each,
          and the space between them is four times the space inside. */}
      <div className="mx-auto max-w-5xl space-y-8 px-3 py-4">
        <PageTitle title={t("nav.tournaments")}>
          {isClubAdmin && (
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              <LuPlus className="h-4 w-4" aria-hidden />
              {t("tournaments.new")}
            </Button>
          )}
        </PageTitle>

        {isLoading ? (
          <Card className="p-3">
            <SkeletonRows rows={3} />
          </Card>
        ) : all.length === 0 ? (
          <Card>
            <EmptyState
              icon={<LuNetwork className="h-5 w-5" aria-hidden />}
              title={t("tournaments.emptyTitle")}
              hint={
                isClubAdmin
                  ? t("tournaments.emptyHintAdmin")
                  : t("tournaments.emptyHint")
              }
            />
          </Card>
        ) : (
          GROUPS.map(({ key, statuses }) => {
            const rows = all.filter((x) => statuses.includes(x.status));
            if (rows.length === 0) return null;
            return (
              <section key={key} className="space-y-2">
                <h2 className="px-1 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
                  {t(key)}
                </h2>
                {rows.map((tournament) => (
                  <TournamentEventCard
                    key={tournament.id}
                    tournament={tournament}
                  />
                ))}
              </section>
            );
          })
        )}
      </div>

      <dialog
        ref={dialogRef}
        className={dialogClasses({ wide: true })}
        aria-label={t("tournaments.new")}
        onClose={() => setIsModalOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setIsModalOpen(false);
        }}
      >
        <h2 className="mb-4 text-h3 font-semibold text-ink">
          {t("tournaments.new")}
        </h2>
        {/* Mounted only while open, so the form starts empty every time. */}
        {shownIsModalOpen && (
          <TournamentForm
            onSubmit={create}
            onCancel={() => setIsModalOpen(false)}
            isSubmitting={createTournament.isPending}
          />
        )}
      </dialog>
    </>
  );
}
