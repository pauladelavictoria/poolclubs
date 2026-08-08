import { createContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import type { Player } from "@/types";

type AuthContextType = {
  user: any;
  isLoading: boolean;
  player: Player | null;
  isPlayerLoading: boolean;
  linkPlayer: (playerId: number) => Promise<void>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  player: null,
  isPlayerLoading: false,
  linkPlayer: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [player, setPlayer] = useState<Player | null>(null);
  const [isPlayerLoading, setIsPlayerLoading] = useState(false);

  const fetchLinkedPlayer = useCallback(async (userId: string) => {
    setIsPlayerLoading(true);
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
      setPlayer(data as Player);
    } else {
      setPlayer(null);
    }
    setIsPlayerLoading(false);
  }, []);

  const linkPlayer = useCallback(
    async (playerId: number) => {
      if (!user) return;
      const { error } = await supabase
        .from("players")
        .update({ user_id: user.id })
        .eq("id", playerId);

      if (error) throw error;

      await fetchLinkedPlayer(user.id);
    },
    [user, fetchLinkedPlayer],
  );

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user || null;
      setUser(currentUser);
      if (currentUser) {
        await fetchLinkedPlayer(currentUser.id);
      }
      setIsLoading(false);
    };

    getUser();

    const { data } = supabase.auth.onAuthStateChange((_, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        setTimeout(() => fetchLinkedPlayer(currentUser.id), 0);
      } else {
        setPlayer(null);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [fetchLinkedPlayer]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, player, isPlayerLoading, linkPlayer }}
    >
      {children}
    </AuthContext.Provider>
  );
};
