import { LuUsers } from "react-icons/lu";
import { entrantCount, type TournamentListItem } from "@/hooks/useTournaments";
import { cardClasses } from "@/components/ui/cardStyles";
import { CategoriesBadge } from "@/components/ui/CategoriesBadge";
import { eventDates } from "@/libs/algorithms/eventDates";
import { FORMAT_KEY, type TournamentStatus } from "@/types";
import { useT } from "@/i18n";
import { AppLink } from "@/components/layout/AppLink";

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

/**
 * One tournament, at the size a tournament deserves: there are rarely more than
 * a handful and each is an event with a beginning and an end, so it gets a
 * title at heading size, its format on a plate, and a status rail — not the
 * anonymous list row it shared with every other kind of thing in the app.
 */
export function TournamentEventCard({
  tournament,
}: {
  tournament: TournamentListItem;
}) {
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
        <CategoriesBadge
          categories={tournament.categories}
          className="text-caption text-ink-faint"
        />
        <span className="flex items-center gap-1 font-mono text-caption tabular-nums text-ink-faint">
          <LuUsers className="h-3.5 w-3.5" aria-hidden />
          {entrants}
        </span>
      </div>
    </AppLink>
  );
}
