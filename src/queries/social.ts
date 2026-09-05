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

/**
 * The comments on one tournament, for the public results page.
 *
 * Keyed on the tournament rather than the club, because that is all a visitor
 * has: they may be in no club at all, and the anon policy only opens the rows
 * whose `tournament_id` is set (sql/schema.sql). The club-wide queries above
 * would come back with the members' game and drill talk filtered out by RLS
 * anyway — asking for the tournament is asking the question we mean.
 */
export type TournamentComment = Comment & {
  /** Null when the author plays nowhere public: the row is still readable, the
   *  person behind it is not, so the thread keeps the comment and loses the
   *  name. A left join, deliberately — `!inner` would drop the comment. */
  author: {
    person: { name: string; slug: string; avatar_url: string | null } | null;
  } | null;
};

export const tournamentCommentsQuery = (tournamentId: number) =>
  queryOptions({
    queryKey: keys.comments.onTournament(tournamentId),
    queryFn: async () => {
      // The author is embedded rather than looked up against a roster: a
      // commenter can be from any club, so the host club's roster cannot name
      // them.
      const { data } = await getSupabase()
        .from("comments")
        .select("*, author:players(person:people(name, slug, avatar_url))")
        .eq("tournament_id", tournamentId)
        .order("created_at")
        .throwOnError();

      return data as unknown as TournamentComment[];
    },
  });

export const tournamentReactionsQuery = (tournamentId: number) =>
  queryOptions({
    queryKey: keys.reactions.onTournament(tournamentId),
    queryFn: async () => {
      const { data } = await getSupabase()
        .from("reactions")
        .select("*")
        .eq("tournament_id", tournamentId)
        .throwOnError();

      return data as Reaction[];
    },
  });

/**
 * The names behind the @mentions in a public thread.
 *
 * The club queries resolve a mention off the roster they already have; out here
 * there is no roster, and the person mentioned may belong to any club. Slugs
 * are unique (people_slug_key), so this is one `in` lookup
 * for the whole thread — and RLS decides what comes back: a person who is not
 * in a public club is simply absent, and the mention stays as typed.
 */
export const mentionedPeopleQuery = (slugs: string[]) =>
  queryOptions({
    queryKey: keys.mentioned.people(slugs),
    enabled: slugs.length > 0,
    queryFn: async () => {
      const { data } = await getSupabase()
        .from("people")
        .select("name, slug")
        .in("slug", slugs)
        .throwOnError();

      return data as { name: string; slug: string }[];
    },
  });
