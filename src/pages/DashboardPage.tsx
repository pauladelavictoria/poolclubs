import { Link } from "react-router-dom";
import { LuChevronRight, LuPlus } from "react-icons/lu";
import PageHeader from "@/components/PageHeader";
import GamesList from "@/components/GamesList";
import { useAuth } from "@/hooks/useAuth";
import { useGetGames } from "@/hooks/useGetGames";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useEloRanking } from "@/hooks/useEloRanking";
import { Card, CardHeader } from "@/components/ui/Card";
import { BallBadge } from "@/components/ui/Ball";
import { ScoreString } from "@/components/ui/ScoreString";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { buttonClasses } from "@/components/ui/buttonStyles";

function SeeAll({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-0.5 text-caption font-medium text-ink-faint transition-colors duration-150 hover:text-ink"
    >
      {label}
      <LuChevronRight className="h-3.5 w-3.5" aria-hidden />
    </Link>
  );
}

export default function DashboardPage() {
  const { player } = useAuth();
  const { data: players } = useGetPlayers();
  // Same query key as the ranking page, so this is a cache hit either direction
  const { data: allGamesData, isLoading } = useGetGames({});
  const { data: recentData } = useGetGames({ pageSize: 5 });

  const ranking = useEloRanking({
    games: allGamesData?.games ?? [],
    players,
  });

  const myIndex = ranking?.findIndex((e) => e.playerId === player?.id) ?? -1;
  const me = myIndex >= 0 ? ranking![myIndex] : null;

  return (
    <>
      <PageHeader title="Inicio">
        <Link
          to="/games/new"
          className={buttonClasses({ size: "sm", className: "shrink-0" })}
        >
          <LuPlus className="h-4 w-4" aria-hidden />
          Añadir partido
        </Link>
      </PageHeader>

      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        {/* Your standing — the one thing you opened the app to see, so it gets
            the full width and the only hero-size ball on the page. The rank is
            the ball itself rather than "#8" beside one; saying it twice would
            split the focal point. */}
        {player && (
          <Card className="p-5">
            <p className="text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
              Tu posición
            </p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
              <div className="flex min-w-0 items-center gap-4">
                {me && <BallBadge rank={myIndex + 1} size="lg" />}
                <div className="min-w-0">
                  <p className="truncate text-h3 font-semibold text-ink">
                    {player.name}
                  </p>
                  <p className="mt-0.5 font-mono text-caption tabular-nums text-ink-faint">
                    {me ? `${me.points} pts` : "Sin partidos todavía"}
                  </p>
                </div>
              </div>
              {me && (
                <div className="shrink-0 text-right">
                  <ScoreString results={me.last10Games ?? []} />
                  <p className="mt-2 font-mono text-caption tabular-nums text-ink-faint">
                    {me.gamesWon}/{me.gamesPlayed} ganados
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to={`/players/${player.id}`}
                className={buttonClasses({
                  variant: "secondary",
                  className: "flex-1",
                })}
              >
                Mi perfil
              </Link>
              <Link
                to={`/players/${player.id}/plan`}
                className={buttonClasses({
                  variant: "secondary",
                  className: "flex-1",
                })}
              >
                Mi plan
              </Link>
            </div>
          </Card>
        )}

        {/* Two peers under the hero: at one column each row is ~490px, so the
            score sits close to the names instead of swimming. */}
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Card className="overflow-hidden">
            <CardHeader
              title="Ranking global"
              action={<SeeAll to="/ranking" label="Ver todo" />}
            />
            {isLoading ? (
              <SkeletonRows rows={5} className="p-3" />
            ) : ranking && ranking.length > 0 ? (
              <ol className="p-2">
                {ranking.slice(0, 5).map((entry, index) => (
                  <li key={entry.playerId}>
                    <Link
                      to={`/players/${entry.playerId}`}
                      className={`flex items-center gap-3 rounded-control px-2 py-2 transition-colors duration-150 hover:bg-felt-raised ${
                        entry.playerId === player?.id ? "bg-strike-tint" : ""
                      }`}
                    >
                      <BallBadge rank={index + 1} />
                      <span className="min-w-0 flex-1 truncate font-medium text-ink">
                        {entry.playerName}
                      </span>
                      <ScoreString
                        results={entry.last10Games ?? []}
                        className="hidden sm:inline-flex"
                      />
                      <span className="font-mono text-body font-semibold tabular-nums text-ink">
                        {entry.points}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="px-4 py-8 text-center text-body text-ink-faint">
                Aún no se ha registrado ningún partido.
              </p>
            )}
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              title="Últimos partidos"
              action={<SeeAll to="/games" label="Ver todos" />}
            />
            <div className="p-3">
              <GamesList games={recentData?.games ?? []} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
