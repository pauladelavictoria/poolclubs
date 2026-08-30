import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/libs/supabase/browser";
import { useAuth } from "@/hooks/useAuth";
import { keys } from "@/libs/queryKeys";
import { gameQuery } from "@/queries/games";
import type { Game } from "@/types";

/** club_id is stamped by the hook, id and created_at by the database.
 *  played_at is the caller's — the form defaults it to now, but it is exactly
 *  the field a backdated result overrides. */
type NewGame = Omit<Game, "id" | "created_at" | "club_id">;

/** The same fields, plus which row they belong to. `club_id` stays out: a
 *  result is corrected, not moved to another club. */
type EditedGame = NewGame & Pick<Game, "id">;

export const useAddGame = () => {
  const { activeClubId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (game: NewGame) => {
      if (!activeClubId) throw new Error("no active club");

      const { data } = await supabase
        .from("games")
        .insert([{ ...game, club_id: activeClubId }])
        // Returned so the caller can close the loop on a challenge — the row id
        // is only known here.
        .select()
        .single()
        .throwOnError();

      return data as Game;
    },
    // The realtime channel invalidates this too, but a mutation that depends on
    // a socket to show its own result is a result that does not appear: a game
    // filed from the challenge loop was still missing from the tape and the
    // ranking on the next navigation. The prefix covers the day lists and the
    // calendar's dots as well.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.games.all }),
  });
};

/** The row the editor is correcting. Undefined id — the add form — asks for
 *  nothing. */
export const useGame = (id?: string) =>
  useQuery({ ...gameQuery(id!), enabled: !!id });

/**
 * Fixing a filed result, and unfiling one.
 *
 * Both are the club admin's, and both are enforced by RLS rather than by the
 * button being hidden: see the policies in sql/schema.sql. A member
 * who calls these gets a denial, which is what dbErrorMessage turns into
 * "common.deniedError" at the call site.
 */
export const useManageGames = () => {
  const queryClient = useQueryClient();

  // A result is on the tape, in the day's ranking, in the calendar's dots and
  // in both players' pages, and a correction moves all of them — so the whole
  // prefix goes, exactly as it does on insert.
  const refresh = (id: string) => {
    queryClient.invalidateQueries({ queryKey: keys.games.all });
    queryClient.invalidateQueries({ queryKey: keys.game.one(id) });
  };

  return {
    updateGame: useMutation({
      mutationFn: async ({ id, ...game }: EditedGame) => {
        const { data } = await supabase
          .from("games")
          .update(game)
          .eq("id", id)
          .select()
          .single()
          .throwOnError();

        return data as Game;
      },
      onSuccess: (saved) => refresh(saved.id),
    }),

    deleteGame: useMutation({
      mutationFn: async (id: string) => {
        await supabase.from("games").delete().eq("id", id).throwOnError();
        return id;
      },
      onSuccess: refresh,
    }),
  };
};
