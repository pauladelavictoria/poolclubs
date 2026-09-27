import { cardClasses } from "@/components/ui/cardStyles";
import { Link } from "@tanstack/react-router";
import { LuCalendar, LuUsers } from "react-icons/lu";
import { Avatar } from "@/components/ui/Avatar";
import { DisciplineBall } from "@/components/ui/DisciplineBall";
import { eventDates } from "@/libs/algorithms/eventDates";
import { type PublicTournamentListItem } from "@/queries/public/tournaments";
import { FORMAT_KEY, type TournamentStatus } from "@/types";
import { useT } from "@/i18n";
import { TournamentCardPodium } from "./TournamentCardPodium";

const isLive = (status: TournamentStatus) =>
  status === "groups" || status === "running";

/** PostgREST returns the aggregate as a one-row array, or none at all. */
const entrants = (t: PublicTournamentListItem) =>
  t.tournament_players[0]?.count ?? 0;

/**
 * The directory's own card: a `.wash` header in the host club's colour, the
 * discipline as a real ball, then the facts a card-grid reader wants — name,
 * club, format, category, entrants.
 */
export function TournamentCard({
  tournament,
  hideClub = false,
}: {
  tournament: PublicTournamentListItem;
  /** On a club's own page the club is the page — repeating it on every card is
   *  noise, the same as it is on TournamentRow. */
  hideClub?: boolean;
}) {
  const { t, locale } = useT();
  const live = isLive(tournament.status);
  const when = eventDates(tournament.starts_on, tournament.ends_on, locale);

  return (
    <Link
      to="/tournaments/$tournamentId"
      params={{ tournamentId: String(tournament.id) }}
      className={cardClasses({
        className: "lift group flex flex-col overflow-hidden",
      })}
    >
      {/* No colour band over the card. It was a block of tint carrying one ball
          and, sometimes, one pill — art where the reader wanted the name, and
          on a card with no date it left half the tile empty. Everything about
          the tournament is a line of text inside instead. */}
      <div className="flex flex-1 flex-col px-4 pt-4 pb-4">
        <div className="flex items-start gap-3">
          {/* The name leads. The discipline ball used to, and a 32px ball over
              a 16px club logo made a left edge of two different circles that
              lined up with nothing; the ball now sits in the footer, at the
              same size as the club's, where it is one of the facts rather than
              the first thing read.

              Two lines rather than one truncated: a tournament's name is how
              somebody recognises it, and "Torneo apertura temporada 2…" is not
              a name. */}
          <h3 className="line-clamp-2 min-w-0 flex-1 text-h4 font-semibold text-ink transition-colors duration-150 group-hover:text-strike">
            {tournament.name}
          </h3>
          {live && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-strike-tint px-2 py-0.5 font-mono text-caption font-semibold text-strike">
              <span
                className="live-dot h-1.5 w-1.5 rounded-full bg-strike"
                aria-hidden
              />
              {t("tournaments.status.running")}
            </span>
          )}
        </div>
        {/* Where and when, in a slot of a fixed height whether or not either
            exists. Both are optional — most tournaments have no date until an
            organiser sets one — and letting the block collapse is what put the
            bottom row of every tile on a different line from its neighbour's. */}
        <div
          className={`mt-3 mb-3 space-y-2 ${hideClub ? "min-h-6" : "min-h-14"}`}
        >
          {!hideClub && tournament.club && (
            <p className="flex items-center gap-1.5 text-caption text-ink-soft">
              <Avatar
                name={tournament.club.name}
                url={tournament.club.logo_url}
                mark
                className="h-5 w-5"
              />
              <span className="truncate">{tournament.club.name}</span>
            </p>
          )}
          {when && (
            <p className="flex items-center gap-1.5 text-caption text-ink-soft">
              {/* Boxed to the width of the circle above it, so the date's text
                  starts on the same line as the club's name. */}
              <LuCalendar
                className="h-3.5 w-5 shrink-0 text-ink-faint"
                aria-hidden
              />
              <span className="truncate">{when}</span>
            </p>
          )}
        </div>
        {/* The bottom of the card, as one block: the podium stands on the
            footer's rule, and the rule lands on the same line on every tile
            whether or not there is a podium above it. */}
        <div className="mt-auto">
          <TournamentCardPodium tournament={tournament} />
          {/* One line of plain text, not two badges and a label. The format and
              the category are facts of the same weight as "all divisions",
              which never had a box around it — three different chromes on one
              row was most of the noise on these cards, and the boxes were also
              what made the row sit at a different height on every tile. */}
          {/* No top margin: the plinths stand ON this rule. The block above
              is what holds the card's spacing, and `mt-auto` on the block is
              what keeps the rule on the same line across a row. */}
          <div className="flex items-center gap-2 border-t border-hairline pt-3 text-caption text-ink-faint">
            <DisciplineBall
              discipline={tournament.discipline}
              className="h-5 w-5 shrink-0"
            />
            <span className="min-w-0 truncate">
              {t(`tournaments.${FORMAT_KEY[tournament.format]}`)}
              {" · "}
              {tournament.categories === null
                ? t("tournaments.combined")
                : `${t("ranking.categoryShort")} ${tournament.categories.map((n) => t("category.short", { n })).join("/")}`}
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-1 font-mono tabular-nums">
              <LuUsers className="h-3.5 w-3.5" aria-hidden />
              {entrants(tournament)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
