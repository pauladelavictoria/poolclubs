import type { ReactNode } from "react";
import { LuChevronDown, LuPencil, LuSettings, LuTrash2 } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { runMutation } from "@/libs/browser/mutationToast";
import type {
  TournamentDetail,
  useManageTournaments,
} from "@/hooks/useTournaments";
import { useT } from "@/i18n";

type Manage = Pick<
  ReturnType<typeof useManageTournaments>,
  | "startTournament"
  | "deleteTournament"
  | "generateKnockout"
  | "updateTournament"
>;

/**
 * Running the tournament, folded away. These were three more cards in a stack
 * of eight that all looked alike, and they are the only ones most of the club
 * can't use at all — so they go last, behind a dashed disclosure, which is the
 * same "not the content" edge the feed already uses.
 *
 * Renders nothing once the tournament is done — there is nothing left to run.
 */
export default function TournamentAdminPanel({
  tournament,
  tournamentId,
  entrants,
  seeded,
  minimum,
  groupsDone,
  manage,
  onEdit,
}: {
  tournament: TournamentDetail;
  tournamentId: number;
  entrants: number[];
  seeded: number[];
  minimum: number;
  groupsDone: boolean;
  manage: Manage;
  onEdit: () => void;
}) {
  const { t } = useT();
  const {
    startTournament,
    deleteTournament,
    generateKnockout,
    updateTournament,
  } = manage;

  if (tournament.status === "open") {
    return (
      <ManagePanel title={t("tournaments.manage")}>
        <p className="text-body text-ink-soft">
          {entrants.length < minimum
            ? t("tournaments.needMore", {
                n: minimum - entrants.length,
                min: minimum,
              })
            : t("tournaments.readyToStart", { n: entrants.length })}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={entrants.length < minimum || startTournament.isPending}
            onClick={() =>
              runMutation(
                startTournament.mutateAsync({ tournament, seededIds: seeded }),
                t,
                "tournaments.started",
                "common.error",
                { denied: "common.deniedError" },
              )
            }
          >
            {t("tournaments.start")}
          </Button>
          <Button variant="secondary" onClick={onEdit}>
            <LuPencil className="h-4 w-4" aria-hidden />
            {t("common.edit")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (
                !confirm(
                  t("tournaments.deleteConfirm", { name: tournament.name }),
                )
              )
                return;
              runMutation(
                deleteTournament.mutateAsync(tournamentId),
                t,
                "tournaments.deleted",
                "common.error",
                { denied: "common.deniedError" },
              );
            }}
          >
            <LuTrash2 className="h-4 w-4" aria-hidden />
            {t("common.delete")}
          </Button>
        </div>
      </ManagePanel>
    );
  }

  if (tournament.status === "groups") {
    return (
      <ManagePanel title={t("tournaments.manage")}>
        <p className="text-body text-ink-soft">
          {groupsDone
            ? t("tournaments.groupsDone", { n: tournament.advance ?? 0 })
            : t("tournaments.groupsPending")}
        </p>
        <Button
          disabled={!groupsDone || generateKnockout.isPending}
          onClick={() =>
            runMutation(
              generateKnockout.mutateAsync(tournament),
              t,
              "tournaments.knockoutReady",
              "common.error",
              { denied: "common.deniedError" },
            )
          }
        >
          {t("tournaments.generateKnockout")}
        </Button>
      </ManagePanel>
    );
  }

  if (tournament.status === "running") {
    return (
      <ManagePanel title={t("tournaments.manage")}>
        <Button
          variant="secondary"
          onClick={() =>
            runMutation(
              updateTournament.mutateAsync({
                id: tournamentId,
                status: "done",
              }),
              t,
              "tournaments.closed",
              "common.error",
              { denied: "common.deniedError" },
            )
          }
        >
          {t("tournaments.close")}
        </Button>
      </ManagePanel>
    );
  }

  return null;
}

/**
 * The organiser's controls. A native <details> — click to open, Esc, no state
 * and no outside-click listener — with a dashed edge, so it reads as scaffolding
 * around the tournament rather than another part of it.
 */
function ManagePanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-card border border-dashed border-hairline">
      <summary className="flex h-11 cursor-pointer list-none items-center gap-2 px-4 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint transition-colors duration-150 hover:text-ink-soft [&::-webkit-details-marker]:hidden">
        <LuSettings className="h-4 w-4" aria-hidden />
        {title}
        <LuChevronDown
          className="ml-auto h-4 w-4 transition-transform duration-150 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="space-y-3 border-t border-dashed border-hairline p-4">
        {children}
      </div>
    </details>
  );
}
