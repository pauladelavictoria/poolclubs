import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/libs/supabase/browser";
import { useAuth, useSession } from "@/hooks/useAuth";
import { optimisticList, tempId } from "@/libs/algorithms/optimistic";
import { keys } from "@/libs/queryKeys";
import {
  commentsQuery,
  mentionedPeopleQuery,
  reactionsQuery,
  tournamentCommentsQuery,
  tournamentReactionsQuery,
} from "@/queries/social";
import { mentionedSlugs } from "@/libs/algorithms/mentions";
import { sendPush } from "@/libs/server/push.functions";
import type { Comment, Reaction, SocialTarget } from "@/types";

/** Turns a target into the column trio the tables use. Exactly one is set —
 *  enforced by a CHECK on both tables in sql/schema.sql. */
const targetColumns = (target: SocialTarget) => ({
  game_id: "gameId" in target ? target.gameId : null,
  drill_log_id: "drillLogId" in target ? target.drillLogId : null,
  tournament_id: "tournamentId" in target ? target.tournamentId : null,
});

type TargetColumns = {
  game_id: string | null;
  drill_log_id: number | null;
  tournament_id: number | null;
};

export const matchesTarget = (row: TargetColumns, target: SocialTarget) =>
  "gameId" in target
    ? row.game_id === target.gameId
    : "drillLogId" in target
      ? row.drill_log_id === target.drillLogId
      : row.tournament_id === target.tournamentId;

export const useComments = () => {
  const { activeClubId } = useAuth();
  return useQuery(commentsQuery(activeClubId));
};

export const useReactions = () => {
  const { activeClubId } = useAuth();
  return useQuery(reactionsQuery(activeClubId));
};

/**
 * Where a comment or a reaction is being written, and by whom.
 *
 * The club version reads all of this off the club route's context. A public
 * tournament page has none of it — no active club, no player row for the club
 * being looked at — so the two supply it differently and share the mutations.
 */
type SocialScope = {
  /** The club the row belongs to. For a tournament that is the club hosting it,
   *  not the author's — see the policies in sql/schema.sql. */
  clubId: number;
  /** Any of the author's own player rows; RLS only asks that it is theirs. */
  playerId: number;
  commentsKey: readonly unknown[];
  reactionsKey: readonly unknown[];
  /** Already-loaded reactions, so a toggle knows whether to insert or delete. */
  reactions: Reaction[] | undefined;
};

const useScopedSocialActions = ({
  clubId,
  playerId,
  commentsKey,
  reactionsKey,
  reactions,
}: SocialScope) => {
  const queryClient = useQueryClient();

  const base = () => ({
    club_id: clubId,
    author_player_id: playerId,
  });

  return {
    addComment: useMutation({
      mutationFn: async ({
        target,
        body,
      }: {
        target: SocialTarget;
        body: string;
      }) => {
        const { data } = await supabase
          .from("comments")
          .insert([{ ...base(), ...targetColumns(target), body: body.trim() }])
          .select("id")
          .single()
          .throwOnError();

        return data.id;
      },
      // Appended at the end because useComments orders by created_at ascending.
      ...optimisticList<{ target: SocialTarget; body: string }, Comment>(
        queryClient,
        commentsKey,
        (rows, { target, body }) => [
          ...rows,
          {
            id: tempId(),
            club_id: clubId,
            author_player_id: playerId,
            ...targetColumns(target),
            body: body.trim(),
            created_at: new Date().toISOString(),
          },
        ],
      ),
      // After the spread, as in useChallenges: a push is a nudge for the people
      // named in the body, never awaited and never surfaced. Who is eligible is
      // decided by push_targets in sql/schema.sql, not here — this only says
      // that a body with an @ in it is worth asking about.
      onSuccess: (id, { body }) => {
        if (!mentionedSlugs(body).length) return;
        void sendPush({ data: { kind: "commentMention", id } }).catch(() => {});
      },
    }),

    editComment: useMutation({
      mutationFn: async ({ id, body }: { id: number; body: string }) => {
        await supabase
          .from("comments")
          .update({ body: body.trim() })
          .eq("id", id)
          .throwOnError();
      },
      ...optimisticList<{ id: number; body: string }, Comment>(
        queryClient,
        commentsKey,
        (rows, { id, body }) =>
          rows.map((c) => (c.id === id ? { ...c, body: body.trim() } : c)),
      ),
      // No push on an edit, deliberately: an @mention added by editing reaches
      // the bell (useNotifications re-reads the body) and nothing else. Pushing
      // would let one comment buzz somebody repeatedly by being edited.
    }),

    deleteComment: useMutation({
      mutationFn: async (id: number) => {
        await supabase.from("comments").delete().eq("id", id).throwOnError();
      },
      ...optimisticList<number, Comment>(queryClient, commentsKey, (rows, id) =>
        rows.filter((c) => c.id !== id),
      ),
    }),

    // Tapping your own reaction again removes it. The unique indexes make the
    // insert path safe even if two taps race.
    toggleReaction: useMutation({
      mutationFn: async ({
        target,
        emoji,
      }: {
        target: SocialTarget;
        emoji: string;
      }) => {
        const { club_id, author_player_id } = base();

        const mine = (reactions ?? []).find(
          (r) =>
            r.author_player_id === author_player_id &&
            r.emoji === emoji &&
            matchesTarget(r, target),
        );

        if (mine) {
          await supabase
            .from("reactions")
            .delete()
            .eq("id", mine.id)
            .throwOnError();
          return;
        }

        await supabase
          .from("reactions")
          .insert([
            { club_id, author_player_id, ...targetColumns(target), emoji },
          ])
          .throwOnError();
      },
      ...optimisticList<{ target: SocialTarget; emoji: string }, Reaction>(
        queryClient,
        reactionsKey,
        (rows, { target, emoji }) => {
          const mine = rows.find(
            (r) =>
              r.author_player_id === playerId &&
              r.emoji === emoji &&
              matchesTarget(r, target),
          );
          return mine
            ? rows.filter((r) => r.id !== mine.id)
            : [
                ...rows,
                {
                  id: tempId(),
                  club_id: clubId,
                  author_player_id: playerId,
                  ...targetColumns(target),
                  emoji,
                  created_at: new Date().toISOString(),
                },
              ];
        },
      ),
    }),
  };
};

/**
 * Commenting and reacting inside a club — games and drill logs. Unchanged for
 * every caller it already had.
 */
export const useSocialActions = () => {
  const { activeClubId, player } = useAuth();
  const { data: reactions } = useReactions();

  return useScopedSocialActions({
    clubId: activeClubId,
    playerId: player.id,
    commentsKey: keys.comments.in(activeClubId),
    reactionsKey: keys.reactions.in(activeClubId),
    reactions,
  });
};

/**
 * Which of the viewer's player rows signs a comment on somebody else's
 * tournament.
 *
 * ponytail: a person with three memberships has three player ids and no
 * principled way to pick one out here, so this takes the first active one. It
 * only decides which id lands in `author_player_id`; the comment renders under
 * the person either way. The real fix is `author_person_id`, which is the wider
 * person-keying migration this deliberately does not do.
 */
const signingPlayerId = (memberships: { id: number; status: string }[]) =>
  memberships.find((m) => m.status === "active")?.id;

/** What a public tournament page reads and, for a signed-in visitor, writes. */
export const useTournamentSocial = (tournamentId: number, clubId: number) => {
  const { memberships, user } = useSession();
  const comments = useQuery(tournamentCommentsQuery(tournamentId));
  const reactions = useQuery(tournamentReactionsQuery(tournamentId));

  const playerId = signingPlayerId(memberships);

  // One lookup for every slug the thread mentions, so a name arrives even for
  // someone from a club the reader has never heard of.
  const slugs = (comments.data ?? []).flatMap((c) => mentionedSlugs(c.body));
  const mentioned = useQuery(mentionedPeopleQuery([...new Set(slugs)]));
  const mentionedBySlug = new Map(
    (mentioned.data ?? []).map((person) => [person.slug, person]),
  );

  const actions = useScopedSocialActions({
    clubId,
    // A signed-out visitor reads and cannot write, so the id is never used —
    // `canWrite` below is what the UI branches on.
    playerId: playerId ?? 0,
    commentsKey: keys.comments.onTournament(tournamentId),
    reactionsKey: keys.reactions.onTournament(tournamentId),
    reactions: reactions.data,
  });

  return {
    comments,
    reactions,
    canWrite: playerId != null,
    /** Which comments are the viewer's own, so they can retract one. */
    myPlayerId: playerId,
    /** The host club's owner may delete anyone's comment — same rule as the
     *  DELETE policy on `comments` in sql/schema.sql, so a button that shows
     *  is a button that works. Owner id rather than a role column because
     *  that is what `isClubAdmin` is elsewhere (routes/app/_authed/$clubSlug). */
    /** slug -> person, for rendering `@slug` as a name. */
    mentionedBySlug,
    canModerate: memberships.some(
      (m) => m.club_id === clubId && m.club?.owner_id === user?.id,
    ),
    ...actions,
  };
};
