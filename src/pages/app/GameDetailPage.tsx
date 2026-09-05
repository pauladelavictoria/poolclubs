import { getRouteApi } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useGame } from "@/hooks/useAddGame";
import { useGameTournaments } from "@/hooks/useTournaments";
import { fmt } from "@/libs/algorithms/dayLabel";
import PageTitle from "@/components/layout/PageTitle";
import FeedMatchCard from "@/components/social/feed/FeedMatchCard";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useT } from "@/i18n";
import { AppLink } from "@/components/layout/AppLink";

const route = getRouteApi("/app/_authed/$clubSlug/games/$gameId/");

/**
 * One result, on its own page.
 *
 * The feed's card, the tape's row and the lobby's tile are all a result in
 * passing — something you read on the way somewhere else. This is the place a
 * result can be sent to somebody, and the place a conversation about it has
 * room: the same card the feed draws, with the thread open under it instead of
 * folded into a count.
 */
export default function GameDetailPage() {
  const { t, locale } = useT();
  const { gameId } = route.useParams();
  const { isClubAdmin } = useAuth();

  const { data: game, isLoading } = useGame(gameId);
  // The same lookup the feed uses, asked for one game: a fixture belongs to its
  // bracket, and the card says so at the top when it does.
  const { data: gameTournaments } = useGameTournaments(game ? [game.id] : []);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-3 py-4">
        <PageTitle title={t("games.detailTitle")} />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-3 py-4">
        <PageTitle title={t("games.detailTitle")} />
        <Card>
          <EmptyState
            title={t("games.notFound")}
            hint={t("games.notFoundHint")}
            action={
              <AppLink
                to="/app/$clubSlug/games"
                className={buttonClasses({ variant: "secondary" })}
              >
                {t("games.seeAll")}
              </AppLink>
            }
          />
        </Card>
      </div>
    );
  }

  // The day in full, spelled out: the card itself only carries the clock, which
  // is all a feed row grouped under a date heading needs.
  const played = fmt(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(game.played_at));

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-3 py-4">
      <PageTitle
        title={t("games.detailTitle")}
        subtitle={<span suppressHydrationWarning>{played}</span>}
      >
        {isClubAdmin && (
          <AppLink
            to="/app/$clubSlug/games/$gameId/edit"
            params={{ gameId: game.id }}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            {t("common.edit")}
          </AppLink>
        )}
      </PageTitle>

      <Card className="p-3">
        <FeedMatchCard
          game={game}
          tournament={gameTournaments?.get(game.id)}
          detail
        />
      </Card>
    </div>
  );
}
