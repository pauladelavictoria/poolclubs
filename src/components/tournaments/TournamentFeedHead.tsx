import { CategoriesBadge } from "@/components/ui/CategoriesBadge";
import { FORMAT_KEY, type Tournament } from "@/types";
import { useT, type Key } from "@/i18n";
import { AppLink } from "@/components/layout/AppLink";

/** Name, discipline and format — the same line the tournament's own page leads
 *  with, so a card in the feed reads as that tournament and not as a summary of
 *  it. */
export function TournamentFeedHead({
  tournament,
  label,
}: {
  tournament: Tournament;
  label?: Key;
}) {
  const { t } = useT();

  return (
    <div className="min-w-0">
      {/* Optional: the open card sits under a heading that already says
          "entries open", so it would be the same words twice. */}
      {label && (
        <p className="text-caption font-medium uppercase tracking-[0.08em] text-strike">
          {t(label)}
        </p>
      )}
      <AppLink
        to="/app/$clubSlug/tournaments/$tournamentId"
        params={{ tournamentId: tournament.id }}
        className="block truncate text-body font-semibold text-ink transition-colors duration-150 hover:text-strike"
      >
        {tournament.name}
      </AppLink>
      <p className="flex flex-wrap items-center gap-x-1 text-caption text-ink-faint">
        <CategoriesBadge categories={tournament.categories} />
        <span className="truncate">
          {" · "}
          {t(`discipline.${tournament.discipline}`)}
          {" · "}
          {t(`tournaments.${FORMAT_KEY[tournament.format]}`)}
        </span>
      </p>
    </div>
  );
}
