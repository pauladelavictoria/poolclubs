import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";

export const useAuth = () => {
  const { user, isLoading, player, isPlayerLoading, linkPlayer } =
    useContext(AuthContext);
  return { user, isLoading, player, isPlayerLoading, linkPlayer };
};
