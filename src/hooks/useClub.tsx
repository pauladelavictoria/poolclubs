import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { keys } from "@/libs/queryKeys";
import { SESSION_KEY, sessionQuery } from "@/queries/session";
import { clubPreviewQuery } from "@/queries/club";
import { clubMembersQuery } from "@/queries/players";
import type { Place } from "@/libs/geocode";
import type { BallColor } from "@/types";

export type { ClubPreview } from "@/queries/club";

/** Everyone in the active club, pending requests included — unlike
 *  useGetPlayers, which is the roster and hides them. */
export const useClubMembers = () => {
  const { activeClubId } = useAuth();
  return useQuery(clubMembersQuery(activeClubId));
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

    // Name, logo, accent colour and location are one settings form with one
    // Guardar button, so they land in a single update rather than four round
    // trips.
    // logoUrl is already a data URI by the time it gets here — see
    // libs/logoImage.ts, the same shrink-in-the-browser approach avatars use.
    updateClub: useMutation({
      mutationFn: async (updates: {
        name?: string;
        logoUrl?: string | null;
        themeColor?: BallColor;
        /** Listed in the public club directory at /clubs. */
        isPublic?: boolean;
        /** All five columns or none: a picked suggestion, or null to forget
         *  it. Never a hand-typed address without coordinates. */
        location?: Place | null;
        /** The club's own clock, as an IANA zone. What decides which night a
         *  result belongs to — see libs/day.ts. The database refuses a zone
         *  Postgres does not know (sql/club-timezone.sql). */
        timezone?: string;
      }) => {
        if (!activeClubId) throw new Error("no active club");

        const patch: {
          name?: string;
          logo_url?: string | null;
          theme_color?: BallColor;
          is_public?: boolean;
          address?: string | null;
          city?: string | null;
          country?: string | null;
          lat?: number | null;
          lon?: number | null;
          timezone?: string;
        } = {};
        if (updates.name !== undefined) patch.name = updates.name.trim();
        if (updates.logoUrl !== undefined) patch.logo_url = updates.logoUrl;
        if (updates.themeColor !== undefined)
          patch.theme_color = updates.themeColor;
        if (updates.isPublic !== undefined) patch.is_public = updates.isPublic;
        if (updates.location !== undefined) {
          const place = updates.location;
          patch.address = place?.address || null;
          patch.city = place?.city || null;
          patch.country = place?.country || null;
          patch.lat = place?.lat ?? null;
          patch.lon = place?.lon ?? null;
        }
        if (updates.timezone !== undefined) patch.timezone = updates.timezone;

        await supabase
          .from("clubs")
          .update(patch)
          .eq("id", activeClubId)
          .throwOnError();
      },
      onSuccess,
    }),
  };
};

/**
 * Creating and joining reach clubs you are not in yet, so they go through
 * SECURITY DEFINER RPCs rather than table writes — see the create_club /
 * join_club definitions in sql/schema.sql.
 *
 * Deliberately does not use `useAuth`: both callers run outside a club —
 * /app/clubs/new and the invite link — where there is no club context to read.
 */
export const useJoinOrCreateClub = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();

  /**
   * Re-read the session, then go to the club if we can address it.
   *
   * A club you just created is yours and active, so it has a slug you can
   * navigate to. One you just *asked* to join is pending, and RLS lets you see
   * your own player row before it lets you see the club it belongs to — so
   * there is no slug yet and /app is as specific as this can be.
   */
  const settle = async (clubId: number) => {
    await queryClient.invalidateQueries({ queryKey: SESSION_KEY });
    const session = await queryClient.fetchQuery(sessionQuery());
    await router.invalidate();

    const slug = session?.memberships.find((m) => m.club_id === clubId)?.club
      ?.slug;

    await navigate(
      slug
        ? { to: "/app/$clubSlug", params: { clubSlug: slug } }
        : { to: "/app" },
    );

    return clubId;
  };

  return {
    createClub: useMutation({
      mutationFn: async (name: string) => {
        const { data } = await supabase
          .rpc("create_club", { club_name: name })
          .throwOnError();

        return settle(data);
      },
    }),

    joinClub: useMutation({
      mutationFn: async ({
        slug,
        claimPlayerId,
        displayName,
      }: {
        slug: string;
        claimPlayerId?: number;
        /** Names are unique per club; this is how two real people sharing one
         *  disambiguate. NULL falls back to the OAuth full_name. */
        displayName?: string;
      }) => {
        const { data } = await supabase
          .rpc("join_club", {
            p_slug: slug,
            // Both default to NULL in the function, so leaving a key out is
            // the same as passing null — and `undefined` is what the generated
            // argument types accept.
            claim_player_id: claimPlayerId,
            display_name: displayName?.trim() || undefined,
          })
          .throwOnError();

        return settle(data);
      },
    }),
  };
};

export const useClubPreview = (slug: string | undefined) =>
  useQuery({ ...clubPreviewQuery(slug ?? ""), enabled: !!slug });
