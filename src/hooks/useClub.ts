import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/libs/supabase/browser";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { keys } from "@/libs/queryKeys";
import { SESSION_KEY, sessionQuery } from "@/queries/session";
import { clubPreviewQuery } from "@/queries/club";
import { clubMembersQuery } from "@/queries/players";
import {
  sendClubApprovedMail,
  sendClubRequestMail,
  sendJoinRequestMail,
  sendMemberApprovedMail,
} from "@/libs/server/mail.functions";
import type { Place } from "@/libs/algorithms/geocode";
import type { Schedule } from "@/libs/algorithms/schedule";
import type { BallColor } from "@/types";

export type { ClubPreview } from "@/queries/club";

/** Everyone in the active club, pending requests included — unlike
 *  usePlayers, which is the roster and hides them. */
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
        return playerId;
      },
      // Tell them they are in. Fired from here rather than from a database
      // trigger, and never awaited, for the same reasons useChallenges fires
      // sendPush that way — see src/libs/server/push.functions.ts. The price is
      // a mail lost if the admin's browser dies in the next second, and the
      // approval itself has already succeeded by then.
      //
      // Ordered after the shared onSuccess so the roster is already moving
      // while the mail goes out; the send decides for itself whether it is
      // allowed to (sql/schema.sql), and says nothing back.
      onSuccess: async (playerId) => {
        await onSuccess();
        void sendMemberApprovedMail({ data: { playerId } }).catch(() => {});
      },
    }),

    // Turning down a request, which is not the same as removing a member:
    // the row stays so the person can be told, and can ask again. Removing is
    // still a delete — see removeMember below.
    rejectMember: useMutation({
      mutationFn: async (playerId: number) => {
        await supabase
          .from("players")
          .update({ status: "rejected" })
          .eq("id", playerId)
          .throwOnError();
        return playerId;
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
    // libs/browser/logoImage.ts, the same shrink-in-the-browser approach avatars use.
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
         *  result belongs to — see libs/algorithms/day.ts. The database refuses a zone
         *  Postgres does not know (sql/schema.sql). */
        timezone?: string;
        /** What the club says about itself, on its public page. */
        description?: string | null;
        /** A public venue's phone number. Stored as typed — it is rendered as a
         *  tel: link and dialled, never parsed. */
        phone?: string | null;
        /** Where to write to the club. Shown to somebody whose request was
         *  turned down, next to the phone number. */
        contactEmail?: string | null;
        /** The room, in the admin's own words: how many tables, what make,
         *  what size. Free text because any schema for it is a guess — see
         *  sql/schema.sql. */
        tablesInfo?: string | null;
        /** Opening hours. The column is jsonb with no CHECK, so the shape is
         *  defended in libs/algorithms/schedule.ts rather than in the database. */
        schedule?: Schedule;
        /** The order the venue photos are shown in; the first is the cover.
         *  An array of storage paths, reconciled against the bucket on read —
         *  see libs/algorithms/photoOrder.ts. */
        photoOrder?: string[];
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
          description?: string | null;
          phone?: string | null;
          contact_email?: string | null;
          tables_info?: string | null;
          schedule?: Schedule;
          photo_order?: string[];
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
        // Empty text is no text: a cleared field should read as unset on the
        // public page, not as an empty paragraph with a heading over it.
        if (updates.description !== undefined)
          patch.description = updates.description?.trim() || null;
        if (updates.phone !== undefined)
          patch.phone = updates.phone?.trim() || null;
        if (updates.contactEmail !== undefined)
          patch.contact_email = updates.contactEmail?.trim() || null;
        if (updates.tablesInfo !== undefined)
          patch.tables_info = updates.tablesInfo?.trim() || null;
        if (updates.schedule !== undefined) patch.schedule = updates.schedule;
        if (updates.photoOrder !== undefined)
          patch.photo_order = updates.photoOrder;

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
 * Joining reaches a club you are not in yet, so it goes through a SECURITY
 * DEFINER RPC rather than a table write — see join_club in sql/schema.sql.
 *
 * Deliberately does not use `useAuth`: it runs outside a club — the invite link
 * — where there is no club context to read.
 */
export const useJoinClub = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();

  /**
   * Re-read the session, then go to the club.
   *
   * A pending membership can address its club too — see the "Pending members can
   * see the club they asked to join" policy in sql/schema.sql, which exists so
   * that the waiting panel has a URL. The /app fallback is for the case where
   * the row has not landed in the re-read session yet.
   */
  const settle = async (clubId: number) => {
    await queryClient.invalidateQueries({ queryKey: SESSION_KEY });
    const session = await queryClient.query(sessionQuery());
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

        // Tell the admin somebody is waiting. Fired here rather than from a
        // trigger, and never awaited, for the same reasons approveMember above
        // fires its mail that way. The send decides for itself whether there is
        // anything pending to tell them about (sql/schema.sql).
        void sendJoinRequestMail({ data: { clubId: data } }).catch(() => {});

        return settle(data);
      },
    }),
  };
};

export const useClubPreview = (slug: string | undefined) =>
  useQuery({ ...clubPreviewQuery(slug ?? ""), enabled: !!slug });

/**
 * Asking for a club, and — for the operator — answering.
 *
 * Clubs are not created from inside the app: the only way one comes into
 * existence is `request_club` from the public page and `approve_club_request`
 * from /app/ops. Both are SECURITY DEFINER RPCs, and the approval side checks
 * `is_drill_admin()` itself — the route guard on /app/ops is the courtesy, not
 * the lock (sql/schema.sql).
 */
/**
 * Walking out of a club.
 *
 * An RPC rather than a table write: the row is not deleted (games reference
 * players ON DELETE CASCADE, so deleting it would take your opponents' copies
 * of those matches with it), and the club's owner is refused outright — see
 * leave_club in sql/schema.sql.
 */
export const useLeaveClub = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clubId: number) => {
      await supabase.rpc("leave_club", { p_club_id: clubId }).throwOnError();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_KEY });
      const session = await queryClient.query(sessionQuery());
      const stillInOne = session?.memberships.some(
        (m) => m.status === "active",
      );

      // A full page load, not router.invalidate() and navigate().
      //
      // You are standing inside the club you just left — the settings page is
      // under /app/<slug> — and invalidating re-runs that route's beforeLoad
      // where it is mounted. It now throws notFound under the tree that is
      // rendering, which React answers by tearing the page down mid-flight:
      // the "removeChild: the node to be removed is not a child of this node"
      // crash, and the error screen instead of the page we were on our way to.
      //
      // Leaving a club is once-in-a-membership, so paying for a reload here
      // buys the one thing that cannot go wrong: the router and the session are
      // both built again from scratch, with no stale membership in either.
      window.location.href = stillInOne ? "/app" : "/";
    },
  });
};

export const useClubRequests = () => {
  const queryClient = useQueryClient();

  return {
    /** Filed by whoever wants the club. Returns the request id, which is all
     *  the mail needs — it reads the rest under the caller's own identity. */
    requestClub: useMutation({
      mutationFn: async (input: {
        name: string;
        city?: string;
        country?: string;
        note?: string;
      }) => {
        const { data } = await supabase
          .rpc("request_club", {
            p_name: input.name,
            p_city: input.city?.trim() || undefined,
            p_country: input.country?.trim().toUpperCase() || undefined,
            p_note: input.note?.trim() || undefined,
          })
          .throwOnError();

        // Never awaited, for the same reason the join request mail is not: the
        // row is already in, and a request nobody was emailed about is still a
        // request sitting on the operator page.
        void sendClubRequestMail({ data: { requestId: data } }).catch(() => {});
        return data;
      },
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: keys.myClubRequest }),
    }),

    approveRequest: useMutation({
      mutationFn: async (requestId: number) => {
        await supabase
          .rpc("approve_club_request", { p_id: requestId })
          .throwOnError();

        void sendClubApprovedMail({ data: { requestId } }).catch(() => {});
        return requestId;
      },
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: keys.operator.clubRequests }),
    }),

    rejectRequest: useMutation({
      mutationFn: async (requestId: number) => {
        await supabase
          .rpc("reject_club_request", { p_id: requestId })
          .throwOnError();
        return requestId;
      },
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: keys.operator.clubRequests }),
    }),
  };
};
