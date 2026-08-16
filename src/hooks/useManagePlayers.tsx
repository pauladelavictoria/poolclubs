import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { keys } from "@/libs/queryKeys";
import type { Category } from "@/types";

export type CreatePlayerInput = {
  name: string;
  category: Category;
};

/**
 * A membership edit, a person edit, or both.
 *
 * They land on two tables now — category is the club's opinion of you and stays
 * on players, while name and is_public are yours and live on people. The caller
 * still passes one object; splitting it is this hook's job, not the form's.
 */
export type UpdatePlayerInput = {
  id: number;
  /** Needed to reach the person; every caller has the player row already. */
  personId: number;
  name?: string;
  category?: Category;
  /** Listed on the public site. Set by the player themselves in their own
   *  settings — see sql/public-pages.sql for what it does and does not hide. */
  is_public?: boolean;
};

export const useManagePlayers = () => {
  const queryClient = useQueryClient();
  const { activeClubId } = useAuth();

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: keys.players.all });
  };

  return {
    // A player added here is a guest with no account — active straight away.
    // People who sign in arrive through join_club() as 'pending' instead.
    //
    // An RPC rather than two inserts: a guest needs a people row and a players
    // row, and no RLS policy on people can express "only if you then add them to
    // a club you own". add_guest_player() is SECURITY DEFINER and checks
    // is_club_admin() itself, which is why people has no INSERT policy at all.
    createPlayer: useMutation({
      mutationFn: async (newPlayer: CreatePlayerInput) => {
        if (!activeClubId) throw new Error("no active club");

        const { data } = await supabase
          .rpc("add_guest_player", {
            cid: activeClubId,
            pname: newPlayer.name,
            cat: newPlayer.category,
          })
          .throwOnError();

        return data as number;
      },
      onSuccess,
    }),

    updatePlayer: useMutation({
      mutationFn: async ({
        id,
        personId,
        category,
        ...person
      }: UpdatePlayerInput) => {
        // Two round trips only when the edit actually spans both tables. The
        // roster editor changes a division and never touches people; player
        // settings change a name and never touch players.
        if (category !== undefined) {
          await supabase
            .from("players")
            .update({ category })
            .eq("id", id)
            .throwOnError();
        }

        // Spelt out rather than filtered from an object: Supabase types an
        // update by its literal keys, and a Record built at runtime widens to a
        // string index that satisfies none of them.
        const personPatch: { name?: string; is_public?: boolean } = {};
        if (person.name !== undefined) personPatch.name = person.name;
        if (person.is_public !== undefined)
          personPatch.is_public = person.is_public;

        if (Object.keys(personPatch).length > 0) {
          await supabase
            .from("people")
            .update(personPatch)
            .eq("id", personId)
            .throwOnError();
        }
      },
      onSuccess,
    }),

    // Deleting the membership leaves the person alone unless this was their last
    // one and they never signed up — see the people_drop_orphan trigger.
    deletePlayer: useMutation({
      mutationFn: async (id: number) => {
        await supabase.from("players").delete().eq("id", id).throwOnError();
      },
      onSuccess,
    }),
  };
};
