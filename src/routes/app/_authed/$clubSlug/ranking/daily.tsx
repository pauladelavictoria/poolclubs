import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import RankingDailyPage from "@/pages/app/RankingDailyPage";
import { gamesQuery } from "@/queries/games";
import { dayKeyOf, zoneOf } from "@/libs/algorithms/day";

/**
 * Today's ladder, for the day named in the URL.
 *
 * `?date` is required rather than defaulting to "today" inside the component.
 * "Today" is `new Date()`, and calling that during render is a hydration
 * mismatch waiting for midnight — the server and the browser can disagree about
 * which day it is. Resolving it here, once, in a redirect, means the component
 * only ever reads a date somebody already decided.
 */
export const Route = createFileRoute("/app/_authed/$clubSlug/ranking/daily")({
  // No crumb back to the all-time ladder: the two views are one section now and
  // the tabs on the page are the way between them.
  staticData: { section: "ranking" },

  validateSearch: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),

  beforeLoad: ({ context, params, search }) => {
    if (!search.date) {
      throw redirect({
        to: "/app/$clubSlug/ranking/daily",
        params,
        // The club's night, in the club's own zone — and resolved here rather
        // than during render so the server and the browser cannot disagree
        // about which one it is.
        search: { date: dayKeyOf(Date.now(), zoneOf(context.activeClub)) },
        replace: true,
      });
    }
  },

  loaderDeps: ({ search }) => ({ date: search.date }),
  // Same filters as the component's own hook, zone included, or the loader
  // primes a key nothing reads.
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      gamesQuery(context.activeClubId, {
        date: deps.date,
        tz: zoneOf(context.activeClub),
      }),
    ),

  component: RankingDailyPage,
});
