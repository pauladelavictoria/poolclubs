import { useQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { LuSearch } from "react-icons/lu";
import DrillCard from "@/components/DrillCard";
import PublicShell, { CtaBand } from "@/components/PublicShell";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { CategoryBadge } from "@/components/ui/Ball";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { TournamentCard } from "@/pages/PublicTournamentsPage";
import { useDebouncedQuery } from "@/libs/useDebouncedQuery";
import { publicSearchQuery } from "@/queries/public";
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
      data.players.length +
      data.tournaments.length +
      data.drills.length
    : 0;

  const suggestions = (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
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
    <PublicShell>
      <header className="pt-6">
        <h1 className="text-h1 font-semibold tracking-tight text-ink">
          {t("public.search.title")}
        </h1>
      </header>

      <SearchInput
        value={q}
        onChange={setQ}
        placeholder={t("public.search.placeholder")}
        className="mt-6 w-full sm:max-w-lg"
        autoFocus
      />

      {/* The proof the search worked: a count per kind, right under the field,
          before any block below has to earn the reader's attention. */}
      {data && total > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {data.clubs.length > 0 && (
            <CountChip label={t("public.publicClubs.count", { n: data.clubs.length })} />
          )}
          {data.players.length > 0 && (
            <CountChip label={t("ranking.playersCount", { n: data.players.length })} />
          )}
          {data.tournaments.length > 0 && (
            <CountChip label={t("tournaments.count", { n: data.tournaments.length })} />
          )}
          {data.drills.length > 0 && (
            <CountChip label={t("public.publicDrills.count", { n: data.drills.length })} />
          )}
        </div>
      )}

      {!term ? (
        <Card className="mt-6">
          <EmptyState
            icon={<LuSearch className="h-5 w-5" aria-hidden />}
            title={t("public.search.promptTitle")}
            hint={t("public.search.promptHint")}
            action={suggestions}
          />
        </Card>
      ) : total === 0 && !isFetching ? (
        <Card className="mt-6">
          <EmptyState
            icon={<LuSearch className="h-5 w-5" aria-hidden />}
            title={t("public.search.noResults")}
            hint={t("public.search.noResultsHint")}
            action={suggestions}
          />
        </Card>
      ) : (
        <div className="mt-6 space-y-10">
          {data && data.clubs.length > 0 && (
            <Block titleKey="public.publicClubs.title" to="/clubs" q={term}>
              <div className="no-bar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
                {data.clubs.map((club) => (
                  <Link
                    key={club.id}
                    to="/clubs/$slug"
                    params={{ slug: club.slug }}
                    data-ball={club.theme_color}
                    className="wash lift flex w-44 shrink-0 snap-start flex-col items-center gap-2 rounded-card border border-hairline p-4 text-center"
                  >
                    <Avatar name={club.name} url={club.logo_url} className="h-12 w-12" />
                    <span className="w-full truncate text-body font-medium text-ink">
                      {club.name}
                    </span>
                    <span className="font-mono text-caption tabular-nums text-ink-faint">
                      {t("public.publicClubs.members", { n: club.member_count })}
                    </span>
                  </Link>
                ))}
              </div>
            </Block>
          )}

          {data && data.players.length > 0 && (
            <Block titleKey="public.publicPlayers.title" to="/players" q={term}>
              <Card className="divide-y divide-hairline">
                {data.players.map((player) => (
                  <Link
                    key={player.id}
                    to="/players/$playerId"
                    params={{ playerId: String(player.id) }}
                    data-ball={player.club?.theme_color}
                    className="flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 hover:bg-felt-raised"
                  >
                    <Avatar name={player.name} url={player.avatar_url} className="h-9 w-9" />
                    <span className="min-w-0 flex-1 truncate text-body text-ink">
                      {player.name}
                      {player.club && (
                        <span className="text-ink-faint">
                          {" · "}
                          {player.club.name}
                        </span>
                      )}
                    </span>
                    <CategoryBadge category={player.category} />
                  </Link>
                ))}
              </Card>
            </Block>
          )}

          {data && data.tournaments.length > 0 && (
            <Block
              titleKey="public.publicTournaments.title"
              to="/tournaments"
              q={term}
            >
              <div className="flex flex-col gap-3">
                {data.tournaments.map((tournament, i) => (
                  <TournamentCard key={tournament.id} tournament={tournament} index={i} />
                ))}
              </div>
            </Block>
          )}

          {data && data.drills.length > 0 && (
            <Block titleKey="public.publicDrills.title" to="/drills" q={term}>
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
  q,
  children,
}: {
  titleKey: Key;
  to: "/clubs" | "/players" | "/tournaments" | "/drills";
  q: string;
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
          // The query travels with the reader, so "see all" lands on the same
          // search rather than on an unfiltered directory.
          search={{ q }}
          className="shrink-0 text-caption font-medium text-strike transition-colors duration-150 hover:text-strike-light"
        >
          {t("common.seeAll")}
        </Link>
      </div>
      {children}
    </section>
  );
}
