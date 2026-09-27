import { useSuspenseQuery } from "@tanstack/react-query";
import { GROUPS } from "@/pages/public/PublicTournamentsPage";
import { TournamentCard } from "@/components/public/TournamentCard";
import { publicTournamentsQuery } from "@/queries/public/tournaments";
import { useT } from "@/i18n";
import { useClub } from "./publicClubData";
import { ClubTabEmpty } from "./ClubTabEmpty";

/**
 * What is on at the club, and the shelf of what has been.
 *
 * The same shape /tournaments has — live, then open, then the archive as rows
 * in one card — because it is the same page scoped to one club, and two lists
 * of tournaments that group differently make the reader learn it twice. It
 * shares that page's GROUPS and its two card components; only the club line is
 * dropped, since the club is the page here.
 */
export function ClubTournamentsTab() {
  const { t } = useT();
  const club = useClub();
  const { data } = useSuspenseQuery(
    publicTournamentsQuery({ clubId: club.id }),
  );

  const all = data.tournaments;
  const grouped = GROUPS.map(({ key, statuses }) => ({
    key,
    rows: all.filter((x) => statuses.includes(x.status)),
  })).filter((group) => group.rows.length > 0);

  if (all.length === 0) {
    return <ClubTabEmpty text={t("public.publicTournaments.emptyTitle")} />;
  }

  return (
    <div className="mt-8 space-y-10">
      {grouped.map(({ key, rows }) => (
        <section key={key}>
          <h2 className="px-1 pb-3 text-caption font-medium tracking-[0.08em] text-ink-faint uppercase">
            {t(key)}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {rows.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                hideClub
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
