import { useQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { LuSearch } from "react-icons/lu";
import DrillCard from "@/components/drills/DrillCard";
import PublicShell, { CtaBand } from "@/components/layout/PublicShell";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { CategoryBadge } from "@/components/ui/Ball";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { TournamentCard } from "@/pages/public/PublicTournamentsPage";
import { useDebouncedQuery } from "@/libs/useDebouncedQuery";
import { publicSearchQuery } from "@/queries/public";
import type { Category } from "@/types";
import { useT } from "@/i18n";
import type { Key } from "@/i18n";

const route = getRouteApi("/_public/search");

/** Example searches, not translated strings — they are seeds to try, the same
 *  way a stock photo seed is not copy. */
const SUGGESTIONS = ["8ball", "league", "potting"];

/**
 * One box over all four kinds of thing, each shown in its own shape rather
 * than a fifth uniform list: a club rail, player rows, a stack of tournament
 * cards, a real drill grid.
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
      <section>
        <div className="px-4 py-6 sm:px-6 sm:py-8">
          <h1 className="text-display leading-[1.05] font-semibold tracking-tighter text-ink">
            {t("public.search.title")}
          </h1>
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder={t("public.search.placeholder")}
            className="mt-5 w-full sm:max-w-xl"
            autoFocus
          />
          {chips("justify-start")}
        </div>
      </section>

      <PublicShell>
        {/* The proof the search worked: a count per kind, before any block below
            has to earn the reader's attention. */}
        {data && total > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-2">
            {data.clubs.length > 0 && (
              <CountChip
                label={t("public.publicClubs.count", { n: data.clubs.length })}
              />
            )}
            {data.people.length > 0 && (
              <CountChip
                label={t("ranking.playersCount", { n: data.people.length })}
              />
            )}
            {data.tournaments.length > 0 && (
              <CountChip
                label={t("tournaments.count", { n: data.tournaments.length })}
              />
            )}
            {data.drills.length > 0 && (
              <CountChip
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
              <Block
                titleKey="public.publicClubs.title"
                to="/clubs"
                term={term}
              >
                <div className="no-bar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
                  {data.clubs.map((club) => (
                    <Link
                      key={club.id}
                      to="/clubs/$slug"
                      params={{ slug: club.slug }}
                      data-ball={club.theme_color}
                      className="wash lift flex w-44 shrink-0 snap-start flex-col items-center gap-2 rounded-card border border-hairline p-4 text-center"
                    >
                      <Avatar
                        name={club.name}
                        url={club.logo_url}
                        mark
                        className="h-12 w-12"
                      />
                      <span className="w-full truncate text-body font-medium text-ink">
                        {club.name}
                      </span>
                      <span className="font-mono text-caption tabular-nums text-ink-faint">
                        {t("public.publicClubs.members", {
                          n: club.member_count,
                        })}
                      </span>
                    </Link>
                  ))}
                </div>
              </Block>
            )}

            {data && data.people.length > 0 && (
              <Block
                titleKey="public.publicPlayers.title"
                to="/players"
                term={term}
              >
                <Card className="divide-y divide-hairline">
                  {data.people.map((person) => {
                    // One hit per person, so the clubs are a list and the
                    // division is the strongest of them — same reading as the
                    // directory row in PublicPlayersPage.
                    const [first] = person.memberships;
                    return (
                      <Link
                        key={person.id}
                        to="/players/$playerSlug"
                        params={{ playerSlug: person.slug }}
                        data-ball={first?.club.theme_color}
                        className="flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 hover:bg-felt-raised"
                      >
                        <Avatar
                          name={person.name}
                          url={person.avatar_url}
                          seed={person.id}
                          className="h-9 w-9"
                        />
                        <span className="min-w-0 flex-1 truncate text-body text-ink">
                          {person.name}
                          {person.memberships.length > 0 && (
                            <span className="text-ink-faint">
                              {" · "}
                              {person.memberships
                                .map((m) => m.club.name)
                                .join(", ")}
                            </span>
                          )}
                        </span>
                        {first && (
                          <CategoryBadge
                            category={
                              Math.min(
                                ...person.memberships.map((m) => m.category),
                              ) as Category
                            }
                          />
                        )}
                      </Link>
                    );
                  })}
                </Card>
              </Block>
            )}

            {data && data.tournaments.length > 0 && (
              <Block
                titleKey="public.publicTournaments.title"
                to="/tournaments"
                term={term}
              >
                <div className="flex flex-col gap-3">
                  {data.tournaments.map((tournament, i) => (
                    <TournamentCard
                      key={tournament.id}
                      tournament={tournament}
                      index={i}
                    />
                  ))}
                </div>
              </Block>
            )}

            {data && data.drills.length > 0 && (
              <Block
                titleKey="public.publicDrills.title"
                to="/drills"
                term={term}
              >
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {data.drills.map((drill, i) => (
                    <DrillCard key={drill.id} drill={drill} public index={i} />
                  ))}
                </div>
              </Block>
            )}
          </div>
        )}

        <CtaBand />
      </PublicShell>
    </>
  );
}

function CountChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-hairline bg-felt px-2.5 py-1 font-mono text-caption tabular-nums text-ink-soft">
      {label}
    </span>
  );
}

/** One kind of result, with the way through to all of them. */
function Block({
  titleKey,
  to,
  term,
  children,
}: {
  titleKey: Key;
  to: "/clubs" | "/players" | "/tournaments" | "/drills";
  term: string;
  children: React.ReactNode;
}) {
  const { t } = useT();

  return (
    <section>
      <div className="flex items-center justify-between gap-3 pb-3">
        <h2 className="text-h3 font-semibold tracking-tight text-ink">
          {t(titleKey)}
        </h2>
        <Link
          to={to}
          // Carries the term: every directory has its own field now, so it
          // arrives filled in and the short list has a visible cause and a way
          // to clear it.
          search={{ q: term || undefined }}
          className="shrink-0 text-caption font-medium text-strike transition-colors duration-150 hover:text-strike-light"
        >
          {t("common.seeAll")}
        </Link>
      </div>
      {children}
    </section>
  );
}
