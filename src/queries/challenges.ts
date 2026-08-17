import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";
import type { Challenge } from "@/types";

/** Every challenge in the club. A club is small enough that filtering the list
 *  client-side beats three query keys that all invalidate together. */
export const challengesQuery = (clubId: number) =>
  queryOptions({
    queryKey: keys.challenges.in(clubId),
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("challenges")
        .select("*")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false })
        .throwOnError();

      return data as Challenge[];
    },
  });
