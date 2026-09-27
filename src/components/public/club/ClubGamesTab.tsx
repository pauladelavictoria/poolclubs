import { useSuspenseQuery } from "@tanstack/react-query";
import GamesList from "@/components/games/GamesList";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import { gamesQuery } from "@/queries/games";
import { useT } from "@/i18n";
import { CLUB_GAMES_LIMIT } from "@/pages/public/PublicClubPage";
import { useClub, useRoster } from "./publicClubData";

/** The results tape. GamesList draws its own empty state, so this one doesn't. */
export function ClubGamesTab() {
  const { t } = useT();
  const club = useClub();
  const roster = useRoster();
  const { data } = useSuspenseQuery(
    gamesQuery(club.id, { pageSize: CLUB_GAMES_LIMIT }),
  );

  return (
    <Card className="mt-8 overflow-hidden">
      <CardHeader title={t("public.publicClub.recentResults")} />
      <div className="p-3">
        <GamesList
          games={data.games}
          players={roster}
          showDates
          public
          clubSlugOf={() => club.slug}
        />
      </div>
    </Card>
  );
}
