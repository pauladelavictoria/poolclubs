import { usePlayers } from "@/hooks/usePlayers";
import { useClubTables } from "@/hooks/useClubTables";
import { useLiveMatches } from "@/hooks/useLiveMatch";
import { AppLink } from "@/components/layout/AppLink";
import { cardClasses } from "@/components/ui/cardStyles";
import { HomeSection, Carousel } from "@/components/home/HomeSection";
import { sideNames } from "@/libs/algorithms/night";
import { useT } from "@/i18n";

/**
 * The night, as a block of the lobby: which tables are busy right now.
 *
 * It carries the heading and the way through to /night, where the same night
 * has its tables, its suggestions and the call button. This is the summary; the
 * page is the room.
 *
 * Above the feed rather than folded into it. A live row's timestamp moves
 * on every rack, so as a feed item it would reorder itself under somebody who is
 * reading — and the feed's own "is there more" is recomputed from the length of
 * the merged list, so a score bump could trip its pagination. It is also not
 * history, which is what the feed is for.
 *
 * Live scores and nothing else. It used to carry a row per person present with
 * a challenge button on each, which on a busy night was the whole first screen
 * of the app spent on a list that /today does better — and a challenge to
 * somebody standing ten feet away is a conversation, not a notification.
 */
export default function TonightPanel() {
  const { t } = useT();
  const { data: live } = useLiveMatches();
  const { data: players } = usePlayers();
  const { data: tables } = useClubTables();
  const matches = live ?? [];
  const labelOf = (tableId: number | null) =>
    (tables ?? []).find((tbl) => tbl.id === tableId)?.label;

  // Nothing on the tables, nothing to show: the block that used to always
  // render did so for the check-in row, which is up in the lobby's action strip
  // now (components/home/NowBar) along with the way through to the night page.
  if (matches.length === 0) return null;

  return (
    <HomeSection titleKey="nav.night" to="/app/$clubSlug/night">
      <Carousel wide>
        {matches.map((match) => {
          const label = labelOf(match.table_id);

          return (
            // Same accent rail as an open tournament: this is the other block
            // on the page asking for something back.
            <AppLink
              key={match.id}
              to="/app/$clubSlug/live/$liveId"
              params={{ liveId: match.id }}
              className={cardClasses({
                interactive: true,
                className:
                  "flex w-full flex-col gap-1 border-l-2 border-l-strike bg-felt-raised px-4 py-3",
              })}
            >
              {/* Which table, first: from the door that is what the row is
                    for. A match with no table is a real thing in a busy club,
                    and it simply has no label. */}
              <p className="truncate text-caption font-medium uppercase tracking-wide text-ink-faint">
                {label || t("live.now")}
              </p>
              {/* Stacked, not mirrored: a card in a row of them has the width
                    for one name, and the two racks line up down the edge. */}
              {([1, 2] as const).map((side) => (
                <div key={side} className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 truncate text-body text-ink">
                    {sideNames(match, side, players ?? [])}
                  </span>
                  <span className="shrink-0 font-mono text-body font-semibold tabular-nums text-ink">
                    {side === 1 ? match.player_1_score : match.player_2_score}
                  </span>
                </div>
              ))}
            </AppLink>
          );
        })}
      </Carousel>
    </HomeSection>
  );
}
