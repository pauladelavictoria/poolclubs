import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { optimisticList, tempId } from "@/libs/optimistic";
import type { Comment, Reaction, SocialTarget } from "@/types";

/** Turns a target into the column pair the tables use. Exactly one is set —
 *  enforced by a CHECK in sql/supabase-migration-social.sql. */
export const targetColumns = (target: SocialTarget) =>
  "gameId" in target
    ? { game_id: target.gameId, drill_log_id: null }
    : { game_id: null, drill_log_id: target.drillLogId };

export const matchesTarget = (
  row: { game_id: string | null; drill_log_id: number | null },
  target: SocialTarget,
) =>
  "gameId" in target
    ? row.game_id === target.gameId
    : row.drill_log_id === target.drillLogId;

// ponytail: fetches the club's whole comment and reaction history in one query
// each, then filters per row in the component. A club is a few dozen people, so
// this is smaller than the games list it decorates — and it means a list of 20
// results costs 2 queries instead of 40, with no prop threading. Switch to
// `.in("game_id", visibleIds)` batching if a club ever passes a few thousand.

export const useComments = () => {
  const { activeClubId } = useAuth();

  return useQuery({
    queryKey: ["comments", activeClubId],
    enabled: !!activeClubId,
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("club_id", activeClubId)
        .order("created_at")
        .throwOnError();

      return data as Comment[];
    },
  });
};

export const useReactions = () => {
  const { activeClubId } = useAuth();

  return useQuery({
    queryKey: ["reactions", activeClubId],
    enabled: !!activeClubId,
    queryFn: async () => {
      const { data } = await supabase
        .from("reactions")
        .select("*")
        .eq("club_id", activeClubId)
        .throwOnError();

      return data as Reaction[];
    },
  });
};

export const useSocialActions = () => {
  const { activeClubId, player } = useAuth();
  const { data: reactions } = useReactions();

  const commentsKey = ["comments", activeClubId];
  const reactionsKey = ["reactions", activeClubId];

  const base = () => {
    if (!activeClubId || !player) throw new Error("no active club");
    return { club_id: activeClubId, author_player_id: player.id };
  };

  return {
    addComment: useMutation({
      mutationFn: async ({
        target,
        body,
      }: {
        target: SocialTarget;
        body: string;
      }) => {
        await supabase
          .from("comments")
          .insert([{ ...base(), ...targetColumns(target), body: body.trim() }])
          .throwOnError();
      },
      // Appended at the end because useComments orders by created_at ascending.
      ...optimisticList<{ target: SocialTarget; body: string }, Comment>(
        commentsKey,
        (rows, { target, body }) => [
          ...rows,
          {
            id: tempId(),
            club_id: activeClubId!,
            author_player_id: player!.id,
            ...targetColumns(target),
            body: body.trim(),
            created_at: new Date().toISOString(),
          },
        ],
      ),
    }),

    deleteComment: useMutation({
      mutationFn: async (id: number) => {
        await supabase.from("comments").delete().eq("id", id).throwOnError();
      },
      ...optimisticList<number, Comment>(commentsKey, (rows, id) =>
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
        reactionsKey,
        (rows, { target, emoji }) => {
          const mine = rows.find(
            (r) =>
              r.author_player_id === player?.id &&
              r.emoji === emoji &&
              matchesTarget(r, target),
          );
          return mine
            ? rows.filter((r) => r.id !== mine.id)
            : [
                ...rows,
                {
                  id: tempId(),
                  club_id: activeClubId!,
                  author_player_id: player!.id,
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
