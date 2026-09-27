import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { LuSearch } from "react-icons/lu";
import DrillCard from "@/components/drills/DrillCard";
import PublicShell from "@/components/layout/PublicShell";
import { CtaBand } from "@/components/layout/CtaBand";
import PublicPageTitle from "@/components/layout/PublicPageTitle";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { ClubCard } from "@/components/public/ClubCard";
import { DRILL_GRID } from "@/pages/public/PublicDrillsPage";
import { GRID } from "@/pages/public/PublicPlayersPage";
import { PersonRow } from "@/components/public/PersonRow";
import { TournamentCard } from "@/components/public/TournamentCard";
import { useDebouncedQuery } from "@/hooks/useDebouncedQuery";
import { publicSearchQuery } from "@/queries/public/search";
import { useT } from "@/i18n";
import { SearchCountChip } from "@/components/public/SearchCountChip";
import { SearchBlock } from "@/components/public/SearchBlock";

const route = getRouteApi("/_public/search");

/** Example searches, not translated strings — they are seeds to try, the same
 *  way a stock photo seed is not copy. */
const SUGGESTIONS = ["8ball", "league", "potting"];

/**
 * One box over all four kinds of thing, each shown in the same card its own
 * directory uses: club cards, player cards, tournament cards, drill cards —
 * so a hit here looks like the thing it is, not like a search-only variant.
 *
 * Each block shows the first few and hands off to that section with the query
 * already applied, rather than trying to be a fifth ranked list — "did you mean a
 * club or a player" is a question the reader can answer instantly and a relevance
 * score cannot.
 */
export default function SearchPage() {
  const { t } = useT();
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const term = search.q?.trim() ?? "";
  const setTerm = (value: string) =>
    navigate({ search: { q: value || undefined }, replace: true });

  // useQuery, not useSuspenseQuery: `enabled` is what keeps an empty box from
  // being a query at all, and a suspense query has no disabled state.
  const { data, isFetching } = useQuery({
    ...publicSearchQuery(term),
    enabled: term.length > 0,
  });

  const [q, setQ] = useDebouncedQuery(search.q ?? "", setTerm);

  const total = data
    ? data.clubs.length +
      data.people.length +
      data.tournaments.length +
      data.drills.length
    : 0;

  const chips = (align: string) => (
    <div className={`mt-5 flex flex-wrap items-center gap-2 ${align}`}>
      <span className="text-caption text-ink-faint">
        {t("public.search.suggestionsLabel")}
      </span>
      {SUGGESTIONS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => setQ(s)}
          className="rounded-full border border-hairline px-3 py-1 font-mono text-caption text-ink-soft transition-colors duration-150 hover:border-hairline-strong hover:text-ink"
        >
          {s}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* The field is the hero. No photograph and no grid above the fold: on a
          page whose whole job is one box, the box is the image. */}
      <PublicPageTitle title={t("public.search.title")}>
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={t("public.search.placeholder")}
          className="mt-5 w-full sm:max-w-xl"
          autoFocus
        />
        {chips("justify-start")}
      </PublicPageTitle>

      <PublicShell>
        {/* The proof the search worked: a count per kind, before any block below
            has to earn the reader's attention. */}
        {data && total > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-2">
            {data.clubs.length > 0 && (
              <SearchCountChip
                label={t("public.publicClubs.count", { n: data.clubs.length })}
              />
            )}
            {data.people.length > 0 && (
              <SearchCountChip
                label={t("ranking.playersCount", { n: data.people.length })}
              />
            )}
            {data.tournaments.length > 0 && (
              <SearchCountChip
                label={t("tournaments.count", { n: data.tournaments.length })}
              />
            )}
            {data.drills.length > 0 && (
              <SearchCountChip
                label={t("public.publicDrills.count", {
                  n: data.drills.length,
                })}
              />
            )}
          </div>
        )}

        {!term ? (
          <Card className="mt-6">
            <EmptyState
              icon={<LuSearch className="h-5 w-5" aria-hidden />}
              title={t("public.search.promptTitle")}
              hint={t("public.search.promptHint")}
              action={chips("justify-center")}
            />
          </Card>
        ) : total === 0 && !isFetching ? (
          <Card className="mt-6">
            <EmptyState
              icon={<LuSearch className="h-5 w-5" aria-hidden />}
              title={t("public.search.noResults")}
              hint={t("public.search.noResultsHint")}
              action={chips("justify-center")}
            />
          </Card>
        ) : (
          <div className="mt-6 space-y-10">
            {data && data.clubs.length > 0 && (
              <SearchBlock
                titleKey="public.publicClubs.title"
                to="/clubs"
                term={term}
              >
                {/* The directory's own grid, one row of it: at five results
                    a rail would scroll horizontally for no reason. */}
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {data.clubs.map((club) => (
                    <ClubCard key={club.id} club={club} />
                  ))}
                </div>
              </SearchBlock>
            )}

            {data && data.people.length > 0 && (
              <SearchBlock
                titleKey="public.publicPlayers.title"
                to="/players"
                term={term}
              >
                <div className={GRID}>
                  {data.people.map((person) => (
                    <PersonRow key={person.id} person={person} />
                  ))}
                </div>
              </SearchBlock>
            )}

            {data && data.tournaments.length > 0 && (
              <SearchBlock
                titleKey="public.publicTournaments.title"
                to="/tournaments"
                term={term}
              >
                <div className="flex flex-col gap-3">
                  {data.tournaments.map((tournament) => (
                    <TournamentCard
                      key={tournament.id}
                      tournament={tournament}
                    />
                  ))}
                </div>
              </SearchBlock>
            )}

            {data && data.drills.length > 0 && (
              <SearchBlock
                titleKey="public.publicDrills.title"
                to="/drills"
                term={term}
              >
                <div className={DRILL_GRID}>
                  {data.drills.map((drill) => (
                    <DrillCard key={drill.id} drill={drill} public />
                  ))}
                </div>
              </SearchBlock>
            )}
          </div>
        )}

        <CtaBand />
      </PublicShell>
    </>
  );
}
