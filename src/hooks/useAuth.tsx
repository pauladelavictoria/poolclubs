import { useCallback } from "react";
import { getRouteApi, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { SESSION_KEY } from "@/queries/session";
import type { Membership } from "@/types";

/** Owner of the GLOBAL drill library — not a club role. Drills are shared by
 *  every club, so this stays a single hardcoded player. Mirrored by the RLS
 *  policies on `drills` in sql/schema.sql — change both together.
 *  Club permissions are `isClubAdmin` below and live in the clubs table. */
export const ADMIN_PLAYER_ID = 1;

const clubRoute = getRouteApi("/app/_authed/$clubSlug");
const rootRoute = getRouteApi("__root__");

/**
 * Re-read who the user is, and re-run every loader that depended on it.
 *
 * The session is cached under one key with no expiry (see queries/session.ts), so
 * anything that changes it — signing in or out, joining a club, being approved —
 * has to say so. Both halves are needed: the query holds the data, the router
 * holds the contexts derived from it.
 */
export const useSessionRefresh = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: SESSION_KEY });
    await router.invalidate();
  }, [queryClient, router]);
};

/**
 * Who you are, in the club you are looking at.
 *
 * This used to read a React context fed by an effect that called
 * `supabase.auth.getUser()`, which is why it had an `isLoading` and why every
 * guard rendered a skeleton first. Now the router has resolved all of it on the
 * server before this component existed — so the shape below is deliberately the
 * same as it was, and every one of its forty-odd call sites is unchanged.
 * `isLoading` and `isPlayerLoading` stay as a constant `false` for that reason:
 * they are what the callers already branch on.
 *
 * Only usable under /app/$clubSlug. The routes that need an account but no club
 * — login, the join link, starting a club — use `useSession()` below.
 */
export const useAuth = () => {
  const ctx = clubRoute.useRouteContext();
  const navigate = useNavigate();
  const refreshMemberships = useSessionRefresh();

  return {
    user: ctx.user,
    memberships: ctx.memberships,
    activeClub: ctx.activeClub,
    activeClubId: ctx.activeClubId,
    /** The user's player row in the active club. Named `player` because every
     *  consumer predates clubs and still means "me". */
    player: ctx.player as Membership,
    isMember: ctx.isMember,
    isClubAdmin: ctx.isClubAdmin,
    isAdmin: ctx.player.id === ADMIN_PLAYER_ID,

    // Switching club is a navigation now, not a localStorage write followed by
    // wiping the whole query cache: the cache keys are already club-scoped, and
    // the new club's loaders run on the way in.
    setActiveClub: (clubId: number) => {
      const slug = ctx.memberships.find((m) => m.club_id === clubId)?.club
        ?.slug;
      if (slug) navigate({ to: "/app/$clubSlug", params: { clubSlug: slug } });
    },

    refreshMemberships,

    isLoading: false as const,
    isPlayerLoading: false as const,
  };
};

/**
 * The signed-in user without a club, for the routes that run before there is
 * one. Anything club-scoped wants `useAuth` instead.
 */
export const useSession = () => {
  const ctx = rootRoute.useRouteContext();
  return {
    session: ctx.session,
    user: ctx.session?.user ?? null,
    memberships: ctx.session?.memberships ?? [],
  };
};
