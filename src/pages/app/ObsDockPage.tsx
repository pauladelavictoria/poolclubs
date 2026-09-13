import { useLiveMatches } from "@/hooks/useLiveMatch";
import { useClubTables } from "@/hooks/useClubTables";
import { usePlayerLookup } from "@/hooks/usePlayers";
import { DisciplineBall } from "@/components/ui/Ball";
import { SkeletonRows } from "@/components/ui/Skeleton";
import type { LiveMatch } from "@/types";
import { useT } from "@/i18n";

/**
 * The operator's own view of the room, meant to live in an OBS Custom
 * Browser Dock — see docs/youtube-streaming.md Phase 1.5b.
 *
 * Scoped down from the doc's original spec: "which table is streaming" and
 * VOD links need Phase 2's club_streams/stream_sessions, which don't exist
 * yet. Until then this shows what the app already knows for free — every
 * table and whatever is live on it, tournament or casual — which is exactly
 * what an operator switching OBS scenes by hand needs to see right now.
 *
 * Poll rather than the realtime channel, matching TvPage: a dock nobody is
 * holding has no focus event to refetch on.
 */
export default function ObsDockPage() {
  const { t } = useT();
  const { data: tables } = useClubTables();
  const { data: matches, isPending } = useLiveMatches({ poll: true });
  const { nameOf } = usePlayerLookup();

  const matchOf = (tableId: number) =>
    matches?.find((m) => m.table_id === tableId);

  const sideName = (match: LiveMatch, side: 1 | 2) => {
    const ids =
      side === 1
        ? [match.player_1_id, match.player_1b_id]
        : [match.player_2_id, match.player_2b_id];
    return ids
      .filter((id): id is number => id !== null)
      .map(nameOf)
      .join(" & ");
  };

  return (
    <div className="min-h-screen space-y-2 bg-[#0b0d10] p-3 font-sans text-white">
      <h1 className="px-1 text-caption font-semibold tracking-wide text-white/50 uppercase">
        {t("obsDock.title")}
      </h1>

      {isPending ? (
        <SkeletonRows rows={3} />
      ) : (
        <ul className="space-y-1.5">
          {(tables ?? []).map((table) => {
            const match = matchOf(table.id);
            return (
              <li
                key={table.id}
                className="flex items-center gap-2 rounded-control border border-white/10 bg-white/5 px-2.5 py-2"
              >
                <span className="w-14 shrink-0 truncate text-caption font-medium text-white/60">
                  {table.label}
                </span>

                {match ? (
                  <>
                    <DisciplineBall
                      discipline={match.discipline}
                      className="h-4 w-4 shrink-0"
                    />
                    <span className="min-w-0 flex-1 truncate text-caption font-semibold">
                      {sideName(match, 1)}{" "}
                      <span className="font-mono text-white/60">
                        {match.player_1_score}–{match.player_2_score}
                      </span>{" "}
                      {sideName(match, 2)}
                    </span>
                    {match.tournament_match_id && (
                      <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[0.65rem] font-medium tracking-wide text-white/70 uppercase">
                        {t("obsDock.tournament")}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-caption text-white/30">
                    {t("obsDock.empty")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
