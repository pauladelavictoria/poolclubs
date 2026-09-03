import { LuSwords } from "react-icons/lu";
import ActivityFeed from "@/components/social/ActivityFeed";
import NowBar from "@/components/home/NowBar";
import TonightPanel from "@/components/live/TonightPanel";
import DrillCard from "@/components/drills/DrillCard";
import GameTile from "@/components/home/GameTile";
import TournamentTile from "@/components/home/TournamentTile";
import { Carousel, HomeSection } from "@/components/home/HomeSection";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useDrills } from "@/hooks/useDrills";
import { useGames } from "@/hooks/useGames";
import { FEED_PAGE_SIZE } from "@/queries/games";
import {
  useMyTournamentIds,
  useTournaments,
  type TournamentListItem,
} from "@/hooks/useTournaments";
import { DRILLS_ENABLED } from "@/libs/algorithms/features";
import { canEnterTournament } from "@/libs/algorithms/tournamentEntry";
import { useT } from "@/i18n";

/** How many rows a block shows before "see all" is the rest of the answer. */
const PER_BLOCK = 8;

/**
 * The club's lobby: one block per part of the club, each showing that part's
 * newest few and linking to the whole of it.
 *
 * It was a single activity feed, which meant everything except the feed lived
 * behind the tab bar's four slots and the drawer — the night, the tournaments,
 * the matches and the drills were all things you had to already know were
 * there. The blocks are the discovery mechanism, and they are content rather
 * than a menu: a row of the actual tournaments beats a tile saying
 * "Tournaments".
 *
 * The action strip comes first — who is here, and the two buttons a member
 * presses on a club night — and then the blocks, which are things to read.
 * Matches lead those, because filing one is why somebody opens the app.
 *
 * A block with nothing in it drops out, except matches: a new club's lobby is
 * the strip, the matches block saying there are none yet, and nothing else —
 * the rest fills in as the club uses each part.
 *
 * The feed stays, last: the blocks are what is going on, the feed is what
 * happened, and it is the only place carrying reactions and comments.
 */
export default function DashboardPage() {
  const { player, isMember } = useAuth();
  const { t } = useT();

  const { data: tournaments } = useTournaments();
  const { data: myTournamentIds } = useMyTournamentIds();
  // The same window the feed below asks for, so the two share one request and
  // this block is free.
  const { data: gamesData } = useGames({ pageSize: FEED_PAGE_SIZE });
  const { data: drills } = useDrills();

  // Everything still to come. A finished tournament is the feed's business — it
  // has a podium there — and everything else is here, in the order it asks
  // something of the reader: what is being played now, then what they can enter
  // (which is the only card carrying a button), then what is open to somebody
  // else's division. Not cut to PER_BLOCK: a club runs a handful of these at a
  // time, and the one you cannot see is the one you do not enter.
  // `isMember` as well as the division rule, the same pair the feed's open card
  // gates its button on: a visitor to the club sees what is open, and is not
  // offered a button that RLS would refuse.
  const rank = (x: TournamentListItem) => {
    if (x.status !== "open") return 0;
    return isMember && canEnterTournament(x.category, player?.category) ? 1 : 2;
  };

  const featured = (tournaments ?? [])
    .filter((x) => x.status !== "done")
    .sort((a, b) => rank(a) - rank(b));

  const games = (gamesData?.games ?? []).slice(0, PER_BLOCK);

  // The drill list arrives sorted for the catalogue — by difficulty, then name
  // — so "latest" is this page's own ordering rather than another request.
  const latestDrills = [...(drills ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, PER_BLOCK);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-3 py-4">
      {/* Who is here and the two things to do about it, before any of the
          blocks: the page's one action strip. */}
      <NowBar />

      {/* First, and the one block that stays put when it is empty: filing a
          result is what a club does every night, and a club with no matches is
          a club that has not started. */}
      <HomeSection titleKey="games.title" to="/app/$clubSlug/games">
        {games.length > 0 ? (
          <Carousel wide>
            {games.map((game) => (
              <GameTile key={game.id} game={game} />
            ))}
          </Carousel>
        ) : (
          <Card>
            <EmptyState
              icon={<LuSwords className="h-5 w-5" />}
              title={t("games.emptyTitle")}
              hint={t("games.emptyHint")}
            />
          </Card>
        )}
      </HomeSection>

      {featured.length > 0 && (
        <HomeSection titleKey="nav.tournaments" to="/app/$clubSlug/tournaments">
          <Carousel>
            {featured.map((tournament) => (
              <TournamentTile
                key={tournament.id}
                tournament={tournament}
                entered={!!myTournamentIds?.has(tournament.id)}
                canJoin={rank(tournament) === 1}
              />
            ))}
          </Carousel>
        </HomeSection>
      )}

      {/* What is on the tables right now. Gone when nothing is — saying you
          have arrived is up in the strip, so this block no longer has to
          render on a quiet afternoon to carry that button. */}
      <TonightPanel />

      {DRILLS_ENABLED && latestDrills.length > 0 && (
        <HomeSection titleKey="drills.title" to="/app/$clubSlug/drills">
          {/* Wider slots than the tournaments row: the table is lying down in
              these, so a narrow card wastes the picture. */}
          <Carousel wide>
            {latestDrills.map((drill) => (
              <DrillCard key={drill.id} drill={drill} landscape />
            ))}
          </Carousel>
        </HomeSection>
      )}

      {/* Matches, drills and finished tournaments in one stream — what the club
          did, in the order it happened, each row open to reactions and
          comments. Carries its own heading, because the filter sits on that
          line. */}
      <ActivityFeed />
    </div>
  );
}
