import { toast } from "react-toastify";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerLookup } from "@/hooks/useGetPlayers";
import { useGetTournament, useManageTournaments } from "@/hooks/useTournaments";
import TournamentPodium from "@/components/TournamentPodium";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CategoryBadge } from "@/components/ui/Ball";
import { placings, resolveBracket } from "@/libs/bracket";
import { leaguePodium, standings } from "@/libs/leagueTable";
import { FORMAT_KEY, type Tournament } from "@/types";
import { useT, type Key } from "@/i18n";
import { AppLink } from "@/components/AppLink";

/** Name, discipline and format — the same line the tournament's own page leads
 *  with, so a card in the feed reads as that tournament and not as a summary of
 *  it. */
function Head({ tournament, label }: { tournament: Tournament; label: Key }) {
  const { t } = useT();

  return (
    <div className="min-w-0">
      <p className="text-caption font-medium uppercase tracking-[0.08em] text-strike">
        {t(label)}
      </p>
      <AppLink
        to="/app/$clubSlug/tournaments/$tournamentId"
        params={{ tournamentId: tournament.id }}
        className="block truncate text-body font-semibold text-ink transition-colors duration-150 hover:text-strike"
      >
        {tournament.name}
      </AppLink>
      <p className="flex flex-wrap items-center gap-x-1 text-caption text-ink-faint">
        {tournament.category === null ? (
          t("tournaments.combined")
        ) : (
          <CategoryBadge category={tournament.category} />
        )}
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

/**
 * A tournament still taking entries. It sits at the top of the feed rather than
 * at its own date, because it is an open invitation and not something that
 * happened — the point of the card is the button.
 */
export function TournamentOpenCard({ tournament }: { tournament: Tournament }) {
  const { t } = useT();
  const { player, isMember } = useAuth();
  const { byId } = usePlayerLookup();
  const { data: detail } = useGetTournament(tournament.id);
  const { joinTournament, leaveTournament } = useManageTournaments();

  const entrants = (detail?.tournament_players ?? []).map((e) => e.player_id);
  const entered = player ? entrants.includes(player.id) : false;
  // A single-division tournament is only open to that division.
  const canEnter =
    tournament.category === null || player?.category === tournament.category;

  const toggle = async () => {
    const tournamentId = tournament.id;
    try {
      await (entered
        ? leaveTournament.mutateAsync({ tournamentId })
        : joinTournament.mutateAsync({ tournamentId }));
      toast.success(t(entered ? "tournaments.left" : "tournaments.joined"));
    } catch {
      // Logged by the mutation cache; this is the part the user sees.
      toast.error(t("common.error"));
    }
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <Head tournament={tournament} label="tournaments.openTitle" />
        {isMember && canEnter && (
          <Button
            size="sm"
            className="shrink-0"
            variant={entered ? "secondary" : "primary"}
            disabled={joinTournament.isPending || leaveTournament.isPending}
            onClick={toggle}
          >
            {entered ? t("tournaments.leave") : t("tournaments.join")}
          </Button>
        )}
      </div>

      <div className="mt-3 border-t border-hairline pt-2">
        <p className="text-caption text-ink-faint">
          {entrants.length === 0
            ? canEnter
              ? t("tournaments.noEntrants")
              : t("tournaments.notEligible")
            : t("tournaments.entrants", { n: entrants.length })}
        </p>
        {entrants.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
            {entrants.map((id) => (
              <li key={id} className="flex min-w-0 items-center gap-1.5">
                <AppLink
                  to="/app/$clubSlug/players/$playerId"
                  params={{ playerId: id }}
                  className="group flex min-w-0 items-center gap-1.5"
                >
                  <Avatar
                    name={byId.get(id)?.name ?? "—"}
                    url={byId.get(id)?.avatar_url}
                    className="h-6 w-6"
                  />
                  <span className="truncate text-caption text-ink-soft transition-colors duration-150 group-hover:text-strike">
                    {byId.get(id)?.name ?? "—"}
                  </span>
                </AppLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/** A tournament that is over: who was on the podium, nothing else. The bracket
 *  behind it is a tap away. */
export function TournamentResultCard({
  tournament,
}: {
  tournament: Tournament;
}) {
  const { byId } = usePlayerLookup();
  const { data: detail } = useGetTournament(tournament.id);

  const matches = resolveBracket(detail?.tournament_matches ?? []);
  const entrants = (detail?.tournament_players ?? []).map((e) => e.player_id);

  // Same reading as the tournament's own page: a league has no final to read a
  // podium off, so its table is the podium.
  const places =
    tournament.format === "league"
      ? leaguePodium(standings(entrants, matches))
      : placings(matches);

  return (
    <>
      <Head tournament={tournament} label="tournaments.results" />
      <TournamentPodium places={places} byId={byId} />
    </>
  );
}
