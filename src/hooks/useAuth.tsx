import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";

/** Only this player may author drills. Mirrored by the RLS policies in
 *  sql/supabase-migration-drills-write.sql — change both together. */
export const ADMIN_PLAYER_ID = 1;

export const useAuth = () => {
  const { user, isLoading, player, isPlayerLoading, linkPlayer } =
    useContext(AuthContext);
  return {
    user,
    isLoading,
    player,
    isPlayerLoading,
    linkPlayer,
    isAdmin: player?.id === ADMIN_PLAYER_ID,
  };
};
