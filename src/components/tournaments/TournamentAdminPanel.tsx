import { useState, type ReactNode } from "react";
import {
  LuChevronDown,
  LuPencil,
  LuSettings,
  LuTrash2,
  LuUserMinus,
  LuUserPlus,
} from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { PlayerOptions } from "@/components/players/PlayerOptions";
import { runMutation } from "@/libs/browser/mutationToast";
import { startField } from "@/libs/algorithms/bracket";
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
  | "addLateEntrant"
  | "removeEntrant"
>;

/** Typed out in full to remove an entrant: their played fixtures go too, and
 *  no click on a crowded panel should be able to do that by itself. Not
 *  translated on purpose — it is a password, not a sentence, and the prompt
 *  says which word in the reader's own language. */
const CONFIRM_WORD = "DELETE";

/**
 * Running the tournament, folded away. These were three more cards in a stack
 * of eight that all looked alike, and they are the only ones most of the club
 * can't use at all — so they go last, behind a dashed disclosure, which is the
 * same "not the content" edge the feed already uses.
 *
 * There is nothing left to run once the tournament is done, but delete stays
 * available — a bracket entered by mistake, or a test run, does not become
 * permanent just because someone closed it.
 */
export default function TournamentAdminPanel({
  tournament,
  tournamentId,
  seeded,
  groupsDone,
  addable,
  entered,
  meId,
  manage,
  onEdit,
}: {
  tournament: TournamentDetail;
  tournamentId: number;
  seeded: number[];
  groupsDone: boolean;
  /** Club players eligible for this tournament and not yet in it. */
  addable: { id: number; name: string }[];
  /** Who is in it, named — the list a removal picks from. */
  entered: { id: number; name: string }[];
  /** The organiser, when they are one of the addable names. */
  meId?: number | null;
  manage: Manage;
  onEdit: () => void;
}) {
  const { t } = useT();
  const {
    startTournament,
    deleteTournament,
    generateKnockout,
    updateTournament,
    addLateEntrant,
    removeEntrant,
  } = manage;
  const [adding, setAdding] = useState("");
  const [removing, setRemoving] = useState("");

  // Who the draw is cut for — the unpaid are dropped in the same transaction
  // that cuts it, and the minimum is counted on who is left. See startField.
  const { drop: unpaidIds, field, minimum } = startField(tournament);

  const handleStart = () => {
    if (
      unpaidIds.length > 0 &&
      !confirm(t("tournaments.removeUnpaidConfirm", { n: unpaidIds.length }))
    )
      return;

    runMutation(
      startTournament.mutateAsync({ tournament, seededIds: seeded }),
      t,
      "tournaments.started",
    );
  };

  if (tournament.status === "open") {
    return (
      <ManagePanel title={t("tournaments.manage")}>
        <p className="text-body text-ink-soft">
          {field.length < minimum
            ? t("tournaments.needMore", {
                n: minimum - field.length,
                min: minimum,
              })
            : t("tournaments.readyToStart", { n: field.length })}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={field.length < minimum || startTournament.isPending}
            onClick={handleStart}
          >
            {t("tournaments.start")}
          </Button>
          <EditButton onEdit={onEdit} />
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
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!groupsDone || generateKnockout.isPending}
            onClick={() =>
              runMutation(
                generateKnockout.mutateAsync(tournament),
                t,
                "tournaments.knockoutReady",
              )
            }
          >
            {t("tournaments.generateKnockout")}
          </Button>
          <EditButton onEdit={onEdit} />
        </div>
      </ManagePanel>
    );
  }

  if (tournament.status === "running") {
    return (
      <ManagePanel title={t("tournaments.manage")}>
        {/* A league is a table, not a draw: a member who turned up in week
            three can still play everyone, so they are drawn against the field
            as they are added. A knockout has no seat to give, which is why
            this is the one format with a late entry at all. */}
        {tournament.format === "league" && (
          <div className="space-y-2">
            <p className="text-body text-ink-soft">
              {t("tournaments.lateEntryHint")}
            </p>
            {addable.length === 0 ? (
              <p className="text-caption text-ink-faint">
                {t("tournaments.allEntered")}
              </p>
            ) : (
              <div className="flex gap-2">
                <Select
                  size="sm"
                  className="min-w-0 flex-1"
                  value={adding}
                  aria-label={t("tournaments.addPlayer")}
                  onChange={(e) => setAdding(e.target.value)}
                >
                  <option value="">{t("tournaments.addPlayer")}</option>
                  <PlayerOptions players={addable} meId={meId} />
                </Select>
                <Button
                  size="sm"
                  className="shrink-0"
                  disabled={!adding || addLateEntrant.isPending}
                  onClick={() => {
                    const playerId = Number(adding);
                    setAdding("");
                    runMutation(
                      addLateEntrant.mutateAsync({ tournament, playerId }),
                      t,
                      "tournaments.added",
                    );
                  }}
                >
                  <LuUserPlus className="h-4 w-4" aria-hidden />
                  {t("tournaments.add")}
                </Button>
              </div>
            )}

            {/* And back out again. Everything they played in this league goes
                with them — see removeEntrant — so this asks for the word to be
                typed rather than for a click somebody is already making. */}
            <p className="pt-2 text-body text-ink-soft">
              {t("tournaments.removeEntrantHint")}
            </p>
            <div className="flex gap-2">
              <Select
                size="sm"
                className="min-w-0 flex-1"
                value={removing}
                aria-label={t("tournaments.removeEntrant")}
                onChange={(e) => setRemoving(e.target.value)}
              >
                <option value="">{t("tournaments.removeEntrant")}</option>
                <PlayerOptions players={entered} meId={meId} />
              </Select>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 text-strike"
                disabled={!removing || removeEntrant.isPending}
                onClick={() => {
                  const playerId = Number(removing);
                  const player = entered.find((p) => p.id === playerId);
                  if (!player) return;

                  const fixtures = tournament.tournament_matches.filter(
                    (m) => m.p1_id === playerId || m.p2_id === playerId,
                  );
                  const typed = prompt(
                    t("tournaments.removeEntrantConfirm", {
                      name: player.name,
                      n: fixtures.length,
                      played: fixtures.filter((m) => m.winner_id !== null)
                        .length,
                      word: CONFIRM_WORD,
                    }),
                  );
                  // Typed exactly, but case and stray spaces are not the
                  // point — the point is that it was typed at all.
                  if (typed?.trim().toUpperCase() !== CONFIRM_WORD) return;

                  setRemoving("");
                  runMutation(
                    removeEntrant.mutateAsync({ tournament, playerId }),
                    t,
                    "tournaments.removed",
                  );
                }}
              >
                <LuUserMinus className="h-4 w-4" aria-hidden />
                {t("common.delete")}
              </Button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
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
              )
            }
          >
            {t("tournaments.close")}
          </Button>
          <EditButton onEdit={onEdit} />
        </div>
      </ManagePanel>
    );
  }

  if (tournament.status === "done") {
    return (
      <ManagePanel title={t("tournaments.manage")}>
        <div className="flex flex-wrap gap-2">
          <EditButton onEdit={onEdit} />
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

  return null;
}

/**
 * Editing stays available after the draw is cut: what a tournament says — its
 * name, its dates, what it costs, the notes the prizes live in — is not what
 * its fixtures were generated from, and only the latter is frozen. The form
 * hides the rest itself (TournamentForm's `locked`).
 */
function EditButton({ onEdit }: { onEdit: () => void }) {
  const { t } = useT();
  return (
    <Button variant="secondary" onClick={onEdit}>
      <LuPencil className="h-4 w-4" aria-hidden />
      {t("common.edit")}
    </Button>
  );
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
