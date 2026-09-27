import { useAuth } from "@/hooks/useAuth";
import { usePlayerLookup } from "@/hooks/usePlayers";
import { useTournament, useManageTournaments } from "@/hooks/useTournaments";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { canEnterTournament } from "@/libs/algorithms/tournamentEntry";
import { runMutation } from "@/libs/browser/mutationToast";
import { type Tournament } from "@/types";
import { useT } from "@/i18n";
import { AppLink } from "@/components/layout/AppLink";
import { PlayerFlag } from "@/components/players/PlayerFlag";
import { TournamentFeedHead } from "./TournamentFeedHead";

/**
 * A tournament still taking entries. It sits at the top of the feed rather than
 * at its own date, because it is an open invitation and not something that
 * happened — the point of the card is the button.
 */
export function TournamentOpenCard({ tournament }: { tournament: Tournament }) {
  const { t } = useT();
  const { player, isMember } = useAuth();
  const { byId } = usePlayerLookup();
  const { data: detail } = useTournament(tournament.id);
  const { joinTournament, leaveTournament } = useManageTournaments();

  const entrants = (detail?.tournament_players ?? []).map((e) => e.player_id);
  const entered = player ? entrants.includes(player.id) : false;
  // A single-division tournament is only open to that division. Same predicate
  // the lobby filters its open list with — see libs/algorithms/tournamentEntry.
  const canEnter = canEnterTournament(tournament.categories, player?.category);

  const toggle = async () => {
    const tournamentId = tournament.id;
    await runMutation(
      entered
        ? leaveTournament.mutateAsync({ tournamentId })
        : joinTournament.mutateAsync({ tournamentId }),
      t,
      entered ? "tournaments.left" : "tournaments.joined",
    );
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <TournamentFeedHead tournament={tournament} />
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
            ? !canEnter && tournament.categories
              ? t("tournaments.notEligible", {
                  category: tournament.categories
                    .map((c) => t(`category.${c}`))
                    .join(", "),
                })
              : t("tournaments.noEntrants")
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
                    <PlayerFlag playerId={id} />
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
