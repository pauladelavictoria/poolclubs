import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { LuPlus, LuNetwork } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import {
  useGetTournaments,
  useManageTournaments,
} from "@/hooks/useTournaments";
import PageHeader from "@/components/PageHeader";
import TournamentForm, {
  type TournamentValues,
} from "@/components/TournamentForm";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CategoryBadge } from "@/components/ui/Ball";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useDialog } from "@/libs/useDialog";
import { FORMAT_KEY, type Tournament, type TournamentStatus } from "@/types";
import { useT, type Key } from "@/i18n";

/** Live first, then what you can still enter, then the archive. */
const SECTIONS: { key: Key; statuses: TournamentStatus[] }[] = [
  { key: "tournaments.live", statuses: ["groups", "running"] },
  { key: "tournaments.openTitle", statuses: ["open"] },
  { key: "tournaments.finished", statuses: ["done"] },
];

export default function TournamentsPage() {
  const { t } = useT();
  const { isClubAdmin } = useAuth();
  const { data: tournaments, isLoading } = useGetTournaments();
  const { createTournament } = useManageTournaments();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const dialogRef = useDialog(isModalOpen);

  const create = async (values: TournamentValues) => {
    try {
      await createTournament.mutateAsync(values);
      setIsModalOpen(false);
      toast.success(t("tournaments.created"));
    } catch {
      // Logged by the mutation cache; this is the part the user sees.
      toast.error(t("common.error"));
    }
  };

  const all = tournaments ?? [];

  return (
    <>
      <PageHeader
        title={t("nav.tournaments")}
        subtitle={t("tournaments.count", { n: all.length })}
      >
        {isClubAdmin && (
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <LuPlus className="h-4 w-4" aria-hidden />
            {t("tournaments.new")}
          </Button>
        )}
      </PageHeader>

      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
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
          SECTIONS.map(({ key, statuses }) => {
            const rows = all.filter((x) => statuses.includes(x.status));
            if (rows.length === 0) return null;
            return (
              <Card key={key} className="overflow-hidden">
                <CardHeader title={t(key)} />
                <ul className="divide-y divide-hairline">
                  {rows.map((tournament) => (
                    <li key={tournament.id}>
                      <Row tournament={tournament} />
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })
        )}
      </div>

      <dialog
        ref={dialogRef}
        className="sheet m-0 mt-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-sheet border border-hairline bg-felt p-5 text-ink sm:m-auto sm:rounded-sheet"
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
        {isModalOpen && (
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

function Row({ tournament }: { tournament: Tournament }) {
  const { t } = useT();

  return (
    <Link
      to={`/app/tournaments/${tournament.id}`}
      viewTransition
      className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-felt-raised"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-medium text-ink">
          {tournament.name}
        </p>
        <p className="truncate text-caption text-ink-faint">
          {t(`discipline.${tournament.discipline}`)}
          {" · "}
          {t(`tournaments.${FORMAT_KEY[tournament.format]}`)}
          {" · "}
          {t(`tournaments.status.${tournament.status}`)}
        </p>
      </div>
      {tournament.category === null ? (
        <span className="shrink-0 text-caption text-ink-faint">
          {t("tournaments.combined")}
        </span>
      ) : (
        <CategoryBadge category={tournament.category} />
      )}
    </Link>
  );
}
