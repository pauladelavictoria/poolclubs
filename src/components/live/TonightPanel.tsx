import { toast } from "react-toastify";
import { useAuth } from "@/hooks/useAuth";
import { usePlayers } from "@/hooks/usePlayers";
import { useClubTables } from "@/hooks/useClubTables";
import { useLiveMatches } from "@/hooks/useLiveMatch";
import { useCheckIn, useWhoIsHere } from "@/hooks/useNight";
import { AppLink } from "@/components/layout/AppLink";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { sideNames } from "@/libs/algorithms/night";
import { useT } from "@/i18n";

/**
 * Right now, in the room: which tables are busy, and who is here.
 *
 * Pinned above the feed rather than folded into it. A live row's timestamp moves
 * on every rack, so as a feed item it would reorder itself under somebody who is
 * reading — and the feed's own "is there more" is recomputed from the length of
 * the merged list, so a score bump could trip its pagination. It is also not
 * history, which is what the feed is for.
 *
 * Two things and no more. It used to carry a row per person present with a
 * challenge button on each, which on a busy night was the whole first screen of
 * the app spent on a list that /today does better — and a challenge to somebody
 * standing ten feet away is a conversation, not a notification. The check-in row
 * always renders, even on a quiet afternoon: it is the one thing here asking for
 * something back, and a block that only appears once somebody else has used it
 * can never be the first use.
 */
export default function TonightPanel() {
  const { t } = useT();
  const { player } = useAuth();
  const { data: live } = useLiveMatches();
  const { data: players } = usePlayers();
  const { data: tables } = useClubTables();
  const here = useWhoIsHere();
  const checkIn = useCheckIn();

  const matches = live ?? [];
  const imHere = here.some((p) => p.id === player?.id);
  const labelOf = (tableId: number | null) =>
    (tables ?? []).find((tbl) => tbl.id === tableId)?.label;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 px-1 text-h4 font-semibold text-ink">
        <span className="live-dot h-2 w-2 rounded-full bg-strike" />
        {t("live.nowHeading")}
      </h2>

      {matches.map((match) => {
        const label = labelOf(match.table_id);

        return (
          <AppLink
            key={match.id}
            to="/app/$clubSlug/live/$liveId"
            params={{ liveId: match.id }}
          >
            {/* Same accent rail as an open tournament: this is the other block
                on the page asking for something back. */}
            <Card className="border-l-2 border-l-strike bg-felt-raised px-4 py-3">
              {/* Which table, first: from the door that is what the row is for.
                  A match with no table is a real thing in a busy club, and it
                  simply has no label. */}
              {label && (
                <p className="text-caption font-medium uppercase tracking-wide text-ink-faint">
                  {t("tables.named", { name: label })}
                </p>
              )}
              <div className="mt-1 flex items-baseline justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-body text-ink">
                  {sideNames(match, 1, players ?? [])}
                </span>
                <span className="font-mono text-h4 font-semibold text-ink tabular-nums">
                  {match.player_1_score} – {match.player_2_score}
                </span>
                <span className="min-w-0 flex-1 truncate text-right text-body text-ink">
                  {sideNames(match, 2, players ?? [])}
                </span>
              </div>
            </Card>
          </AppLink>
        );
      })}

      <Card className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        {here.length > 0 ? (
          <div className="flex min-w-0 items-center gap-3">
            {/* Faces, not a list: the answer to "is it worth going down" is who,
                and the count is the caption on them. */}
            <div className="flex -space-x-3">
              {here.slice(0, 8).map((p) => (
                <Avatar
                  key={p.id}
                  name={p.name}
                  url={p.avatar_url}
                  className="h-8 w-8 ring-2 ring-felt"
                />
              ))}
            </div>
            <span className="truncate text-caption text-ink-faint">
              {t("tonight.count", { n: here.length })}
            </span>
          </div>
        ) : (
          <p className="min-w-0 text-caption text-ink-faint">
            {t("tonight.nobody")}
          </p>
        )}

        <Button
          variant={imHere ? "secondary" : "primary"}
          onClick={() =>
            checkIn.mutate(
              { here: !imHere },
              { onError: () => toast.error(t("common.error")) },
            )
          }
          disabled={checkIn.isPending || !player}
        >
          {imHere ? t("tonight.youreHere") : t("tonight.imHere")}
        </Button>
      </Card>
    </section>
  );
}
