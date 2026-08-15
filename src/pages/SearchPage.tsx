import { useQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { LuSearch } from "react-icons/lu";
import PublicShell from "@/components/PublicShell";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardHeader } from "@/components/ui/Card";
import { CategoryBadge } from "@/components/ui/Ball";
import { DifficultyTag } from "@/components/ui/DifficultyTag";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { TournamentRow } from "@/pages/PublicTournamentsPage";
import { useDebouncedQuery } from "@/libs/useDebouncedQuery";
import { publicSearchQuery } from "@/queries/public";
import { useT } from "@/i18n";
import type { Key } from "@/i18n";

const route = getRouteApi("/_public/search");

/**
 * One box over all four kinds of thing.
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

  // useQuery, not useSuspenseQuery: `enabled` is what keeps an empty box from
  // being a query at all, and a suspense query has no disabled state.
  const { data, isFetching } = useQuery({
    ...publicSearchQuery(term),
    enabled: term.length > 0,
  });

  const [q, setQ] = useDebouncedQuery(search.q ?? "", (value) =>
    navigate({ search: { q: value || undefined }, replace: true }),
  );

  const total = data
    ? data.clubs.length +
      data.players.length +
      data.tournaments.length +
      data.drills.length
    : 0;

  return (
    <PublicShell title={t("public.search.title")}>
      <SearchInput
        value={q}
        onChange={setQ}
        placeholder={t("public.search.placeholder")}
        className="w-full sm:max-w-lg"
        autoFocus
      />

      {!term ? (
        <Card className="mt-6">
          <EmptyState
            icon={<LuSearch className="h-5 w-5" aria-hidden />}
            title={t("public.search.promptTitle")}
            hint={t("public.search.promptHint")}
          />
        </Card>
      ) : total === 0 && !isFetching ? (
        <Card className="mt-6">
          <EmptyState
            icon={<LuSearch className="h-5 w-5" aria-hidden />}
            title={t("public.search.noResults")}
            hint={t("public.search.noResultsHint")}
          />
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {data && data.clubs.length > 0 && (
            <Block titleKey="public.publicClubs.title" to="/clubs" q={term}>
              {data.clubs.map((club) => (
                <li key={club.id}>
                  <Link
                    to="/clubs/$slug"
                    params={{ slug: club.slug }}
                    className="flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 hover:bg-felt-raised"
                  >
                    <Avatar
                      name={club.name}
                      url={club.logo_url}
                      className="h-8 w-8"
                    />
                    <span className="min-w-0 flex-1 truncate text-body text-ink">
                      {club.name}
                    </span>
                    <span className="shrink-0 font-mono text-caption tabular-nums text-ink-faint">
                      {club.member_count}
                    </span>
                  </Link>
                </li>
              ))}
            </Block>
          )}

          {data && data.players.length > 0 && (
            <Block titleKey="public.publicPlayers.title" to="/players" q={term}>
              {data.players.map((player) => (
                <li key={player.id}>
                  <Link
                    to="/players/$playerId"
                    params={{ playerId: String(player.id) }}
                    className="flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 hover:bg-felt-raised"
                  >
                    <Avatar
                      name={player.name}
                      url={player.avatar_url}
                      className="h-8 w-8"
                    />
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
                </li>
              ))}
            </Block>
          )}

          {data && data.tournaments.length > 0 && (
            <Block
              titleKey="public.publicTournaments.title"
              to="/tournaments"
              q={term}
            >
              {data.tournaments.map((tournament) => (
                <li key={tournament.id}>
                  <TournamentRow tournament={tournament} />
                </li>
              ))}
            </Block>
          )}

          {data && data.drills.length > 0 && (
            <Block titleKey="public.publicDrills.title" to="/drills" q={term}>
              {data.drills.map((drill) => (
                <li key={drill.id}>
                  <Link
                    to="/drills/$drillId"
                    params={{ drillId: String(drill.id) }}
                    className="flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 hover:bg-felt-raised"
                  >
                    <span className="min-w-0 flex-1 truncate text-body text-ink">
                      {drill.name}
                    </span>
                    <DifficultyTag
                      difficulty={drill.difficulty}
                      pips
                      className="shrink-0"
                    />
                  </Link>
                </li>
              ))}
            </Block>
          )}
        </div>
      )}
    </PublicShell>
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
    <Card className="overflow-hidden">
      <CardHeader
        title={t(titleKey)}
        action={
          <Link
            to={to}
            // The query travels with the reader, so "see all" lands on the same
            // search rather than on an unfiltered directory.
            search={{ q }}
            className="text-caption font-medium text-strike transition-colors duration-150 hover:text-strike-light"
          >
            {t("common.seeAll")}
          </Link>
        }
      />
      <ul className="divide-y divide-hairline">{children}</ul>
    </Card>
  );
}
