import { Link, useNavigate } from "react-router-dom";
import { LuChevronRight, LuSwords } from "react-icons/lu";
import ActivityFeed from "@/components/ActivityFeed";
import { useAuth } from "@/hooks/useAuth";
import { useGetGames } from "@/hooks/useGetGames";
import { useGetPlayers, usePlayerLookup } from "@/hooks/useGetPlayers";
import { useEloRanking } from "@/hooks/useEloRanking";
import { useMyChallenges } from "@/hooks/useChallenges";
import { useGetTournaments } from "@/hooks/useTournaments";
import { TournamentOpenCard } from "@/components/TournamentFeedCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { BallBadge } from "@/components/ui/Ball";
import { ScoreString } from "@/components/ui/ScoreString";
import { useT } from "@/i18n";

/** Turns "You vs {name}" into the same sentence with just the name linked to
 *  that player's page. */
function withPlayerLink(text: string, name: string, playerId: number) {
  const idx = text.indexOf(name);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <Link
        to={`/app/players/${playerId}`}
        onClick={(e) => e.stopPropagation()}
        className="text-ink hover:text-strike"
      >
        {name}
      </Link>
      {text.slice(idx + name.length)}
    </>
  );
}

export default function DashboardPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const { player } = useAuth();
  const myChallenges = useMyChallenges();
  const { data: players } = useGetPlayers();
  const { nameOf } = usePlayerLookup();
  // Same query key as the ranking page, so this is a cache hit either direction
  const { data: allGamesData } = useGetGames({});
  // Same key the feed below reads, so listing the open ones costs no request.
  const { data: tournaments } = useGetTournaments();
  const open = (tournaments ?? []).filter((x) => x.status === "open");

  const ranking = useEloRanking({
    games: allGamesData?.games ?? [],
    players,
  });

  const myIndex = ranking?.findIndex((e) => e.playerId === player?.id) ?? -1;
  const me = myIndex >= 0 ? ranking![myIndex] : null;

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        {/* You first, then what is waiting on you, then what you can enter, then
            what everyone else has been doing. */}
        {player && (
          <Card className="p-5">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
              <div className="flex min-w-0 items-center gap-4">
                {me && <BallBadge rank={myIndex + 1} size="lg" />}
                <div className="min-w-0">
                  <Link
                    to={`/app/players/${player.id}`}
                    className="block truncate text-h3 font-semibold text-ink hover:text-strike"
                  >
                    {player.name}
                  </Link>
                  <p className="mt-0.5 font-mono text-caption tabular-nums text-ink-faint">
                    {me
                      ? t("common.pts", { n: me.points })
                      : t("dashboard.noGamesYet")}
                  </p>
                </div>
              </div>
              {me && (
                <div className="shrink-0 text-right">
                  <ScoreString results={me.last10Games ?? []} />
                  <p className="mt-2 font-mono text-caption tabular-nums text-ink-faint">
                    {t("dashboard.wonOf", {
                      won: me.gamesWon,
                      played: me.gamesPlayed,
                    })}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Your open challenges. Above the fold or they may as well not
            exist — the ones waiting on an answer sit first and tinted. */}
        {myChallenges.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader
              title={t("challenge.title")}
              action={
                <LuChevronRight
                  className="h-4 w-4 shrink-0 text-ink-faint"
                  aria-hidden
                />
              }
            />
            <ul className="divide-y divide-hairline">
              {myChallenges.map((c) => {
                const waitingOnMe =
                  c.status === "pending" && c.to_player_id === player?.id;
                const opponentId =
                  c.from_player_id === player?.id
                    ? c.to_player_id
                    : c.from_player_id;
                const opponentName = nameOf(opponentId);
                const text =
                  c.from_player_id === player?.id
                    ? t("challenge.youVs", { name: opponentName })
                    : t("challenge.vsYou", { name: opponentName });
                return (
                  <li key={c.id}>
                    {/* Not a native <Link> because the opponent's name inside
                        is itself a link to their page, and <a> cannot nest. */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate("/app/challenges")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate("/app/challenges");
                        }
                      }}
                      className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-pocket ${
                        waitingOnMe ? "bg-strike-tint" : ""
                      }`}
                    >
                      <LuSwords
                        className={`h-4 w-4 shrink-0 ${waitingOnMe ? "text-strike" : "text-ink-faint"}`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-body text-ink">
                        {withPlayerLink(text, opponentName, opponentId)}
                      </span>
                      <span className="shrink-0 text-caption text-ink-faint">
                        {t(
                          c.status === "accepted"
                            ? "challenge.on"
                            : waitingOnMe
                              ? "challenge.incoming"
                              : "challenge.waiting",
                        )}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {/* An invitation, not a record: the accent is here because this is the
            one block on the page asking for something back. */}
        {open.length > 0 && (
          <section className="space-y-3">
            <h2 className="px-1 text-h4 font-semibold text-ink">
              {t("tournaments.openTitle")}
            </h2>
            {open.map((tournament) => (
              <Card
                key={tournament.id}
                className="border-l-2 border-l-strike bg-felt-raised px-4 py-3"
              >
                <TournamentOpenCard tournament={tournament} />
              </Card>
            ))}
          </section>
        )}

        {/* Matches, drills and finished tournaments in one stream — what the
            club did, in the order it happened, each row open to reactions and
            comments. Carries its own heading, because the filter sits on that
            line. */}
        <ActivityFeed />
      </div>
    </>
  );
}
