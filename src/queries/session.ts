import { queryOptions } from "@tanstack/react-query";
import { getSession } from "@/libs/auth.functions";

/**
 * Who is looking at the page, as a query rather than a bare call.
 *
 * The root route's beforeLoad runs on every navigation, so calling the server
 * function directly would cost a round trip per link. Cached under one key with
 * no expiry instead: it only changes when the user signs in or out, and both of
 * those invalidate it by hand.
 */
export const SESSION_KEY = ["session"] as const;

export const sessionQuery = () =>
  queryOptions({
    queryKey: SESSION_KEY,
    queryFn: () => getSession(),
    staleTime: Infinity,
  });
