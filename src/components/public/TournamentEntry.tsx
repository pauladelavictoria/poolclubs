import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/Button";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { canEnterTournament } from "@/libs/algorithms/tournamentEntry";
import { refreshTournaments } from "@/libs/browser/refresh";
import { runMutation } from "@/libs/browser/mutationToast";
import { supabase } from "@/libs/supabase/browser";
import { useSession } from "@/hooks/useAuth";
import { publicTournamentQuery } from "@/queries/public/tournaments";
import type { PublicTournament } from "@/queries/public/tournaments";
import { useT } from "@/i18n";

/**
 * The way in, for whoever is reading the page.
 *
 * Entering a tournament is a member's action — the RLS policy on
 * tournament_players wants an active player row in the host club and your own
 * user behind it (see sql/schema.sql) — so what this renders is whichever step
 * of that the visitor is missing: sign in, join the club, or enter. A stranger
 * who lands here from a share link gets a path rather than a disabled button.
 *
 * Only while entries are open. Once the draw is cut the field is fixed, and a
 * button that would always fail is worse than no button.
 *
 * The mutation is written here rather than reused from useManageTournaments:
 * that hook reads `useAuth`, which only exists under /app/$clubSlug. Out here
 * the membership comes off the root context instead.
 */
export function TournamentEntry({
  tournament,
  entrantIds,
  partners,
}: {
  tournament: PublicTournament;
  entrantIds: number[];
  partners: Map<number, number>;
}) {
  const { t } = useT();
  const { session, memberships } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Their player row in *this* club. Someone can be a member of three clubs and
  // a pending request at a fourth; only an active row here can enter.
  const membership = memberships.find(
    (m) => m.club_id === tournament.club_id && m.status === "active",
  );
  // In a pair either half is entered; the row is the captain's either way.
  const myEntry = membership
    ? entrantIds.find(
        (id) => id === membership.id || partners.get(id) === membership.id,
      )
    : undefined;
  const entered = myEntry !== undefined;
  // A tournament limited to one division is not open to the others — the same
  // rule as the club's own page.
  const eligible = canEnterTournament(
    tournament.categories,
    membership?.category,
  );

  const entry = useMutation({
    mutationFn: async () => {
      if (!membership) throw new Error("no player");
      if (entered) {
        await supabase
          .from("tournament_players")
          .delete()
          .eq("tournament_id", tournament.id)
          .eq("player_id", myEntry!)
          .throwOnError();
      } else {
        await supabase
          .from("tournament_players")
          .insert([{ tournament_id: tournament.id, player_id: membership.id }])
          .throwOnError();
      }
    },
    onSuccess: async () => {
      // Both halves, for the reason useAuth's refresh gives: the query holds the
      // entrants, the route's loader holds the copy this page renders.
      //
      // Refetched by passing the options with staleTime 0, not by invalidating
      // the key: the loader primes this query with staleTime "static", nothing
      // on the page observes it, and static beats isInvalidated inside
      // isStaleByTime — so an invalidate here refetched nothing and the entrant
      // list kept the field it was rendered with.
      await queryClient.query({
        ...publicTournamentQuery(tournament.id),
        staleTime: 0,
      });
      await router.invalidate();
      // And the app's own copies — the entrant count on the index, "my
      // entries" — which the same person may open next.
      refreshTournaments(queryClient);
    },
  });

  if (tournament.status !== "open") return null;

  if (!session) {
    return (
      <Link
        to="/app/login"
        search={{ next: `/tournaments/${tournament.id}` }}
        className={buttonClasses({ size: "sm" })}
      >
        {t("public.publicTournament.signInToEnter")}
      </Link>
    );
  }

  // Signed in, but not a player at this club yet — the invite link is the same
  // one the club hands out, and it comes back here afterwards.
  if (!membership) {
    return tournament.club ? (
      <Link
        to="/app/join/$slug"
        params={{ slug: tournament.club.slug }}
        className={buttonClasses({ size: "sm" })}
      >
        {t("public.publicTournament.joinClubToEnter")}
      </Link>
    ) : null;
  }

  // A tournament with no category takes anybody who has a division, and a
  // membership always has one — so ineligible here always means a division
  // tournament, and the copy always has a division to name.
  if (!entered && !eligible && tournament.categories) {
    return (
      <p className="max-w-[24ch] text-caption text-ink-faint">
        {t("tournaments.notEligible", {
          category: tournament.categories
            .map((c) => t(`category.${c}`))
            .join(", "),
        })}
      </p>
    );
  }

  // A pair is entered from the club's own page, where the partner is picked
  // from the members — this page has no picker to offer.
  if (!entered && tournament.mode === "doubles" && tournament.club) {
    return (
      <Link
        to="/app/$clubSlug/tournaments/$tournamentId"
        params={{
          clubSlug: tournament.club.slug,
          tournamentId: String(tournament.id),
        }}
        className={buttonClasses({ size: "sm" })}
      >
        {t("tournaments.enterAsPair")}
      </Link>
    );
  }

  return (
    <Button
      size="sm"
      variant={entered ? "secondary" : "primary"}
      disabled={entry.isPending}
      onClick={() =>
        runMutation(
          entry.mutateAsync(),
          t,
          entered ? "tournaments.left" : "tournaments.joined",
        )
      }
    >
      {entered ? t("tournaments.leave") : t("tournaments.join")}
    </Button>
  );
}
