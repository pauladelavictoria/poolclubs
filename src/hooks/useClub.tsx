import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { keys } from "@/libs/queryKeys";
import type { Player } from "@/types";

export type ClubPreview = {
  club_id: number;
  club_name: string;
  player_id: number | null;
  player_name: string | null;
  /** Nobody has claimed this player row yet, so a new member may take it. */
  claimable: boolean | null;
};

/** Everyone in the active club, pending requests included — unlike
 *  useGetPlayers, which is the roster and hides them. */
export const useClubMembers = () => {
  const { activeClubId } = useAuth();

  return useQuery({
    queryKey: keys.clubMembers.in(activeClubId),
    enabled: !!activeClubId,
    queryFn: async () => {
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("club_id", activeClubId)
        .order("name")
        .throwOnError();

      return data as Player[];
    },
  });
};

export const useManageClub = () => {
  const queryClient = useQueryClient();
  const { activeClubId, refreshMemberships } = useAuth();

  // Membership changes move a player between the roster and the pending list,
  // so both caches go.
  const onSuccess = async () => {
    queryClient.invalidateQueries({ queryKey: keys.clubMembers.all });
    queryClient.invalidateQueries({ queryKey: keys.players.all });
    await refreshMemberships();
  };

  return {
    approveMember: useMutation({
      mutationFn: async (playerId: number) => {
        await supabase
          .from("players")
          .update({ status: "active" })
          .eq("id", playerId)
          .throwOnError();
      },
      onSuccess,
    }),

    // Removing drops their games and drill logs with them (ON DELETE CASCADE).
    removeMember: useMutation({
      mutationFn: async (playerId: number) => {
        await supabase
          .from("players")
          .delete()
          .eq("id", playerId)
          .throwOnError();
      },
      onSuccess,
    }),

    renameClub: useMutation({
      mutationFn: async (name: string) => {
        await supabase
          .from("clubs")
          .update({ name: name.trim() })
          .eq("id", activeClubId)
          .throwOnError();
      },
      onSuccess,
    }),
  };
};

/** Creating and joining reach clubs you are not in yet, so they go through
 *  SECURITY DEFINER RPCs rather than table writes — see
 *  sql/supabase-migration-clubs.sql. */
export const useJoinOrCreateClub = () => {
  const { refreshMemberships, setActiveClub } = useAuth();

  const settle = async (clubId: number) => {
    await refreshMemberships();
    setActiveClub(clubId);
    return clubId;
  };

  return {
    createClub: useMutation({
      mutationFn: async (name: string) => {
        const { data } = await supabase
          .rpc("create_club", { club_name: name })
          .throwOnError();

        return settle(data as number);
      },
    }),

    joinClub: useMutation({
      mutationFn: async ({
        code,
        claimPlayerId,
        displayName,
      }: {
        code: string;
        claimPlayerId?: number;
        /** Names are unique per club; this is how two real people sharing one
         *  disambiguate. NULL falls back to the OAuth full_name. */
        displayName?: string;
      }) => {
        const { data } = await supabase
          .rpc("join_club", {
            code,
            claim_player_id: claimPlayerId ?? null,
            display_name: displayName?.trim() || null,
          })
          .throwOnError();

        return settle(data as number);
      },
    }),
  };
};

/** What the join link shows before you commit: club name, plus the unclaimed
 *  players so a regular who predates accounts can pick themselves. */
export const useClubPreview = (code: string | undefined) =>
  useQuery({
    queryKey: keys.clubPreview.for(code),
    enabled: !!code,
    retry: false,
    queryFn: async () => {
      const { data } = await supabase
        .rpc("club_preview", { code })
        .throwOnError();

      const rows = (data ?? []) as ClubPreview[];
      if (rows.length === 0) throw new Error("unknown join code");

      // The RPC LEFT JOINs, so an empty club comes back as one row of nulls.
      const players = rows.filter((r) => r.player_id !== null);

      return {
        clubId: rows[0].club_id,
        clubName: rows[0].club_name,
        unclaimed: players
          .filter((r) => r.claimable)
          .map((r) => ({ id: r.player_id as number, name: r.player_name as string })),
        /** Lowercased and trimmed, to match the name check in join_club(). */
        takenNames: new Set(
          players.map((r) => (r.player_name as string).trim().toLowerCase()),
        ),
      };
    },
  });
