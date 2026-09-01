import { useState } from "react";
import { LuPlus, LuNetwork, LuUsers } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import {
  entrantCount,
  useTournaments,
  useManageTournaments,
  type TournamentListItem,
} from "@/hooks/useTournaments";
import { runMutation } from "@/libs/browser/mutationToast";
import PageTitle from "@/components/layout/PageTitle";
import TournamentForm, {
  type TournamentValues,
} from "@/components/tournaments/TournamentForm";
import { Card } from "@/components/ui/Card";
import { cardClasses, dialogClasses } from "@/components/ui/cardStyles";
import { Button } from "@/components/ui/Button";
import { CategoryBadge } from "@/components/ui/Ball";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useDialog } from "@/hooks/useDialog";
import { eventDates } from "@/libs/algorithms/eventDates";
import { FORMAT_KEY, type TournamentStatus } from "@/types";
import { useT, type Key } from "@/i18n";
import { AppLink } from "@/components/layout/AppLink";

/** Live first, then what you can still enter, then the archive. */
const GROUPS: { key: Key; statuses: TournamentStatus[] }[] = [
  { key: "tournaments.live", statuses: ["groups", "running"] },
  { key: "tournaments.openTitle", statuses: ["open"] },
  { key: "tournaments.finished", statuses: ["done"] },
];

/**
 * The rail down the left edge of a card is the tournament's state, read before
 * anything is read. A live or open draw is something you can still act on, so
 * it wears the club's colour; a finished one is history and gets a hairline.
 */
const RAIL: Record<TournamentStatus, string> = {
  open: "border-l-strike",
  groups: "border-l-strike",
  running: "border-l-strike",
  done: "border-l-hairline-strong",
};

export default function TournamentsPage() {
  const { t } = useT();
  const { isClubAdmin } = useAuth();
  const { data: tournaments, isLoading } = useTournaments();
  const { createTournament } = useManageTournaments();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const dialogRef = useDialog(isModalOpen);

  const create = async (values: TournamentValues) => {
    const ok = await runMutation(
      createTournament.mutateAsync(values),
      t,
      "tournaments.created",
      "common.error",
      { denied: "common.deniedError" },
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
                  <EventCard key={tournament.id} tournament={tournament} />
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

/**
 * One tournament, at the size a tournament deserves: there are rarely more than
 * a handful and each is an event with a beginning and an end, so it gets a
 * title at heading size, its format on a plate, and a status rail — not the
 * anonymous list row it shared with every other kind of thing in the app.
 */
function EventCard({ tournament }: { tournament: TournamentListItem }) {
  const { t, locale } = useT();
  const entrants = entrantCount(tournament);
  const when = eventDates(tournament.starts_on, tournament.ends_on, locale);

  return (
    <AppLink
      to="/app/$clubSlug/tournaments/$tournamentId"
      params={{ tournamentId: tournament.id }}
      viewTransition
      className={cardClasses({
        interactive: true,
        className: `flex items-start gap-3 border-l-2 px-4 py-3.5 ${RAIL[tournament.status]}`,
      })}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-h4 font-semibold text-ink">
          {tournament.name}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-faint">
          {/* The format is the one fact that changes what the page will look
              like when you get there, so it is set apart rather than run into
              the sentence. */}
          <span className="rounded-control border border-hairline bg-pocket px-1.5 py-0.5 font-mono uppercase tracking-[0.06em] text-ink-soft">
            {t(`tournaments.${FORMAT_KEY[tournament.format]}`)}
          </span>
          <span className="truncate">
            {t(`discipline.${tournament.discipline}`)}
            {" · "}
            {t(`tournaments.status.${tournament.status}`)}
          </span>
        </p>
        {/* The date under the facts rather than in them: it is the one thing a
            member checks before deciding to enter, and it is prose. */}
        {when && (
          <p className="mt-1 text-caption text-ink-soft">
            {when}
            {tournament.entry_fee ? ` · ${tournament.entry_fee}` : null}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {tournament.category === null ? (
          <span className="text-caption text-ink-faint">
            {t("tournaments.combined")}
          </span>
        ) : (
          <CategoryBadge category={tournament.category} />
        )}
        <span className="flex items-center gap-1 font-mono text-caption tabular-nums text-ink-faint">
          <LuUsers className="h-3.5 w-3.5" aria-hidden />
          {entrants}
        </span>
      </div>
    </AppLink>
  );
}
