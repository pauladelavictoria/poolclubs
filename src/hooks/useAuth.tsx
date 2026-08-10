import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";

/** Owner of the GLOBAL drill library — not a club role. Drills are shared by
 *  every club, so this stays a single hardcoded player. Mirrored by the RLS
 *  policies on `drills` in sql/schema.sql — change both together.
 *  Club permissions are `isClubAdmin` below and live in the clubs table. */
export const ADMIN_PLAYER_ID = 1;

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  return {
    ...ctx,
    isAdmin: ctx.player?.id === ADMIN_PLAYER_ID,
    isClubAdmin: !!ctx.user && ctx.activeClub?.owner_id === ctx.user.id,
    /** Signed in, approved, and looking at a club. Everything club-scoped waits
     *  on this — a pending member has a player row but may read nothing. */
    isMember: ctx.player?.status === "active",
  };
};
