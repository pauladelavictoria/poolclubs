import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";
import type { Player } from "@/types";

/**
 * The query, on its own, so a route loader and a component hook can share one
 * definition and one cache key.
 *
 * This is the pattern for everything under src/queries: the Supabase call moved
 * out of the hook unchanged, the hook became a two-line `useQuery(...)` wrapper,
 * and the route that renders it can now prime the same key in its loader. Two
 * copies of a query mean two keys, and two keys mean the loader warms a cache the
 * component never reads.
 *
 * Cache invalidation on inserts/updates lives in libs/browser/realtime.ts — one channel
 * for the app, rather than one per hook instance.
 */

/** Every column of the person, embedded on the membership. */
const PLAYER_SELECT = "*, person:people(*)";

type WithPerson = {
  person: {
    name: string;
    avatar_url: string | null;
    slug: string;
    is_public: boolean;
    /** Optional because anon is not granted it — see sql/schema.sql. Present
     *  for a member reading their own club, null everywhere public. */
    user_id?: string | null;
  } | null;
};

/**
 * Spread the person's fields onto the membership row.
 *
 * ponytail: the database is properly normalised — name, face and slug live on
 * `people` and nowhere else — but flattening here means the ~18 components that
 * render `player.name` or `player.avatar_url` did not have to learn about the
 * split. The cost is that every query selecting players has to remember to embed
 * the person and pass the rows through this; the type in src/types/index.ts is
 * what enforces it, since Player has no `name` of its own to fall back on.
 *
 * `person` is nullable only because PostgREST types every embed that way. The FK
 * is NOT NULL, so the fallbacks below are unreachable in practice; they exist so
 * a missing embed shows up as a blank name rather than a crash in a bracket.
 */
export const flattenPlayer = <T extends WithPerson>(row: T) => {
  const { person, ...membership } = row;
  return {
    ...membership,
    name: person?.name ?? "",
    avatar_url: person?.avatar_url ?? null,
    slug: person?.slug ?? "",
    is_public: person?.is_public ?? false,
    user_id: person?.user_id ?? null,
  } as unknown as Player;
};

/** Alphabetical, in JS rather than in the query.
 *
 *  PostgREST cannot order parent rows by a column on an embedded table, and name
 *  now lives on the embed. A club roster is tens of rows, so sorting them here
 *  costs nothing. The public directory has the same problem and cannot solve it
 *  this way — it is paginated, so it queries `people` directly instead. See
 *  publicPlayersQuery in src/queries/public.ts. */
const byName = (rows: Player[]) =>
  rows.sort((a, b) => a.name.localeCompare(b.name));

/** The roster: approved members only. Pending requests are useClubMembers. */
export const playersQuery = (clubId: number) =>
  queryOptions({
    queryKey: keys.players.in(clubId),
    // `.throwOnError()` hands the failure to react-query, which logs it once in
    // libs/queryClient.ts. Same everywhere; see that file.
    queryFn: async () => {
      const supabase = getSupabase();
      // ponytail: the whole roster, unpaged. A club is a few dozen people, and
      // every consumer — the rankings, the opponent pickers, the name lookup
      // behind every result — wants all of them at once. The global lobby is
      // the one club this does not hold for: it grows without bound, so page it
      // or move the pickers to a server-side search before the lobby is a few
      // thousand people.
      const { data } = await supabase
        .from("players")
        .select(PLAYER_SELECT)
        .eq("club_id", clubId)
        .eq("status", "active")
        .throwOnError();

      // The tablet's own account is a member so that RLS will let it score, but
      // it is not a player: leaving it in would put a face in the roster, a row
      // in both rankings and a name in every opponent picker.
      return byName((data ?? []).map(flattenPlayer)).filter(
        (p) => !p.is_device,
      );
    },
  });

/** Everyone in the club, pending requests included — the device account too,
 *  which is the one place it has to be visible so an owner can choose it. */
export const clubMembersQuery = (clubId: number) =>
  queryOptions({
    queryKey: keys.clubMembers.in(clubId),
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("players")
        .select(PLAYER_SELECT)
        .eq("club_id", clubId)
        .throwOnError();

      return byName((data ?? []).map(flattenPlayer));
    },
  });
