import { AppLink } from "@/components/layout/AppLink";
import { CategoryBadge } from "@/components/ui/Ball";
import { Button } from "@/components/ui/Button";
import { cardClasses } from "@/components/ui/cardStyles";
import {
  entrantCount,
  useManageTournaments,
  type TournamentListItem,
} from "@/hooks/useTournaments";
import { runMutation } from "@/libs/browser/mutationToast";
import { FORMAT_KEY } from "@/types";
import { useT } from "@/i18n";

/**
 * A tournament as one card in the lobby's row of them.
 *
 * The feed's open card is a block: the button, the entrants, their faces. This
 * is the same tournament at a glance — where it is up to, what it is, how many
 * are in. Counting entrants from the list row rather than fetching each
 * tournament's detail is what keeps a row of six cards at one request.
 *
 * Entering is here rather than only on the tournament's page: a row of cards
 * you can enter, where entering costs a trip to another page and back, is a row
 * of cards nobody enters. Leaving stays over there — undoing is a decision, and
 * a decision belongs where the whole thing is in front of you.
 */
export default function TournamentTile({
  tournament,
  entered,
  canJoin = false,
}: {
  tournament: TournamentListItem;
  /** Shown instead of the entrant count: the one fact about it that is yours. */
  entered: boolean;
  /** Open, and open *to this player* — the division rule, decided by the caller
   *  because it already sorts the row by it. */
  canJoin?: boolean;
}) {
  const { t } = useT();
  const { joinTournament } = useManageTournaments();
  const open = tournament.status === "open";

  const join = () =>
    runMutation(
      joinTournament.mutateAsync({ tournamentId: tournament.id }),
      t,
      "tournaments.joined",
      "common.error",
      { denied: "common.deniedError" },
    );

  return (
    <div
      className={cardClasses({
        interactive: true,
        className: "relative flex w-full flex-col gap-1.5 p-3",
      })}
    >
      {/* The card is the tap, laid over it rather than wrapped around it: the
          enter button is inside, and a button inside a link is neither. */}
      <AppLink
        to="/app/$clubSlug/tournaments/$tournamentId"
        params={{ tournamentId: tournament.id }}
        viewTransition
        aria-label={tournament.name}
        className="absolute inset-0 rounded-card"
      />

      {/* Open is an invitation and wears the accent; anything else is a state
          and reads as one. */}
      <p
        className={`text-caption font-medium uppercase tracking-[0.08em] ${
          open ? "text-strike" : "text-ink-faint"
        }`}
      >
        {t(`tournaments.status.${tournament.status}`)}
      </p>

      <h3 className="line-clamp-2 text-body font-semibold leading-snug text-ink">
        {tournament.name}
      </h3>

      <p className="flex flex-wrap items-center gap-x-1 text-caption text-ink-faint">
        {tournament.category === null ? (
          t("tournaments.combined")
        ) : (
          <CategoryBadge category={tournament.category} />
        )}
        <span className="truncate">
          {" · "}
          {t(`tournaments.${FORMAT_KEY[tournament.format]}`)}
        </span>
      </p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <p className="min-w-0 truncate text-caption text-ink-soft">
          {entered
            ? t("tournaments.joined")
            : t("tournaments.entrants", { n: entrantCount(tournament) })}
        </p>
        {canJoin && !entered && (
          <Button
            size="sm"
            className="relative shrink-0"
            disabled={joinTournament.isPending}
            onClick={join}
          >
            {t("tournaments.join")}
          </Button>
        )}
      </div>
    </div>
  );
}
