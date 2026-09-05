import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";
import { isPlaceholderPlayer } from "@/libs/algorithms/placeholderPlayer";

export type ClubPreview = {
  club_id: number;
  club_name: string;
  player_id: number | null;
  player_name: string | null;
  /** Nobody has claimed this player row yet, so a new member may take it. */
  claimable: boolean | null;
};

/**
 * What the join link shows before you commit: club name, plus the unclaimed
 * players so a regular who predates accounts can pick themselves.
 *
 * Reaches a club you are not in yet, so it goes through a SECURITY DEFINER RPC
 * rather than a table read — see club_preview in sql/schema.sql.
 */
export const clubPreviewQuery = (slug: string) =>
  queryOptions({
    queryKey: keys.clubPreview.for(slug),
    retry: false,
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .rpc("club_preview", { p_slug: slug })
        .throwOnError();

      // Null, not a throw: "there is no club with that slug" is an answer, and
      // one the server has to be able to render. Thrown, it left the cache
      // empty, so the page arrived as a loading skeleton and only admitted the
      // link was dead once JavaScript had run — on the page that a mistyped
      // invite code, and now a wrong /app/<slug>, both land on.
      const rows = (data ?? []) as ClubPreview[];
      if (rows.length === 0) return null;

      // The RPC LEFT JOINs, so an empty club comes back as one row of nulls.
      const players = rows.filter((r) => r.player_id !== null);

      return {
        clubId: rows[0].club_id,
        clubName: rows[0].club_name,
        // The guest placeholder is unclaimed by construction and must stay
        // that way: it is the row every visitor's game is filed against, so
        // claiming it would hand one arriving member all of them. See
        // libs/algorithms/placeholderPlayer.ts.
        unclaimed: players
          .filter(
            (r) =>
              r.claimable && !isPlaceholderPlayer({ name: r.player_name ?? "" }),
          )
          .map((r) => ({
            id: r.player_id as number,
            name: r.player_name as string,
          })),
        // takenNames is gone: join_club() no longer rejects a duplicate name,
        // because names are no longer unique inside a club. See sql/schema.sql.
      };
    },
  });
