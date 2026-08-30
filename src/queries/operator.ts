import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";

/**
 * One row per club, across every club — the only query in the app that is not
 * scoped to a club or a person.
 *
 * It goes through `operator_clubs()` (sql/operator-dashboard.sql) rather than a
 * table read, because RLS scopes `clubs` and `games` to the caller's own
 * memberships. The gate lives in the function: a caller who is not the operator
 * gets an empty array, which is why there is nothing to check here.
 */
export type OperatorClub = {
  id: number;
  name: string;
  slug: string;
  is_public: boolean;
  member_count: number;
  pending_count: number;
  games_total: number;
  games_7d: number;
  games_30d: number;
  /** null for a club that has never recorded a match — the thing this page
   *  exists to notice. */
  last_game_at: string | null;
  created_at: string;
};

export const operatorClubsQuery = () =>
  queryOptions({
    queryKey: keys.operator.clubs,
    queryFn: async (): Promise<OperatorClub[]> => {
      const { data, error } = await getSupabase().rpc("operator_clubs");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
