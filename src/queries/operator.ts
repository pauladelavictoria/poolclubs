import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";

/**
 * One row per club, across every club — the only query in the app that is not
 * scoped to a club or a person.
 *
 * It goes through `operator_clubs()` (sql/schema.sql) rather than a
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

/**
 * A club somebody has asked us to add, before anybody has decided.
 *
 * Read straight off the table rather than through a function: the RLS policies
 * on `club_requests` already say who sees what — your own rows, and every row
 * for the operator — so a SECURITY DEFINER wrapper would only restate them.
 */
export type ClubRequest = {
  id: number;
  name: string;
  city: string | null;
  country: string | null;
  note: string | null;
  requested_by: string;
  status: "open" | "approved" | "rejected";
  club_id: number | null;
  created_at: string;
  decided_at: string | null;
};

export const clubRequestsQuery = () =>
  queryOptions({
    queryKey: keys.operator.clubRequests,
    queryFn: async (): Promise<ClubRequest[]> => {
      const { data, error } = await getSupabase()
        .from("club_requests")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []) as ClubRequest[];
    },
  });

/**
 * The caller's own request, if they have one waiting.
 *
 * Same table, same policies, and no operator gate — this is the half of it that
 * answers "did that go through?" on the public page. Signed out it reads
 * nothing, which is the empty array.
 */
export const myClubRequestQuery = () =>
  queryOptions({
    queryKey: keys.myClubRequest,
    queryFn: async (): Promise<ClubRequest | null> => {
      const { data, error } = await getSupabase()
        .from("club_requests")
        .select("*")
        .eq("status", "open")
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return (data as ClubRequest | null) ?? null;
    },
  });
