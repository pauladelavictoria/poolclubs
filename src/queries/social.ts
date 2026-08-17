import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";
import type { Comment, Reaction } from "@/types";

// ponytail: fetches the club's whole comment and reaction history in one query
// each, then filters per row in the component. A club is a few dozen people, so
// this is smaller than the games list it decorates — and it means a list of 20
// results costs 2 queries instead of 40, with no prop threading. Switch to
// `.in("game_id", visibleIds)` batching if a club ever passes a few thousand.
//
// These two are not primed by any route loader on purpose: SocialBar is rendered
// deep inside lists rather than by a page, so there is no route that knows
// whether they are needed. They stay client-side queries.

export const commentsQuery = (clubId: number) =>
  queryOptions({
    queryKey: keys.comments.in(clubId),
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("club_id", clubId)
        .order("created_at")
        .throwOnError();

      return data as Comment[];
    },
  });

export const reactionsQuery = (clubId: number) =>
  queryOptions({
    queryKey: keys.reactions.in(clubId),
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("reactions")
        .select("*")
        .eq("club_id", clubId)
        .throwOnError();

      return data as Reaction[];
    },
  });
