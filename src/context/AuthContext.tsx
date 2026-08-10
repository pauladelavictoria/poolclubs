import { createContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { queryClient } from "@/libs/queryClient";
import type { Club, Membership } from "@/types";

const ACTIVE_CLUB_KEY = "activeClub";

type AuthContextType = {
  user: any;
  isLoading: boolean;
  /** Every club the user belongs to, pending ones included. */
  memberships: Membership[];
  isPlayerLoading: boolean;
  activeClub: Club | null;
  activeClubId: number | null;
  setActiveClub: (clubId: number) => void;
  /** The user's player row in the active club. Named `player` because every
   *  consumer predates clubs and still means "me". */
  player: Membership | null;
  refreshMemberships: () => Promise<void>;
};

const noop = async () => {};

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  memberships: [],
  isPlayerLoading: false,
  activeClub: null,
  activeClubId: null,
  setActiveClub: () => {},
  player: null,
  refreshMemberships: noop,
});

/** Providers disagree on the field name; Google sends both, GitHub only one. */
const avatarOf = (user: any): string | undefined =>
  user?.user_metadata?.avatar_url || user?.user_metadata?.picture || undefined;

const readStoredClub = () => {
  const raw = localStorage.getItem(ACTIVE_CLUB_KEY);
  return raw ? Number(raw) || null : null;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isPlayerLoading, setIsPlayerLoading] = useState(false);
  const [storedClubId, setStoredClubId] = useState<number | null>(readStoredClub);

  const fetchMemberships = useCallback(
    async (userId: string, avatarUrl?: string) => {
      setIsPlayerLoading(true);
      const { data, error } = await supabase
        .from("players")
        .select("*, club:clubs(*)")
        .eq("user_id", userId);

      const rows = !error && data ? (data as Membership[]) : [];

      // Only the owner can read their own auth metadata, so the OAuth picture is
      // copied onto the player rows — otherwise every other member sees an
      // initial. Written on sign-in and whenever the provider changes the URL.
      //
      // An uploaded avatar is a data: URI and a deliberate choice, so it is left
      // alone; otherwise the next sign-in would quietly put Google's face back.
      const stale = rows.filter(
        (m) => m.avatar_url !== avatarUrl && !m.avatar_url?.startsWith("data:"),
      );
      if (avatarUrl && stale.length) {
        await supabase
          .from("players")
          .update({ avatar_url: avatarUrl })
          .in(
            "id",
            stale.map((m) => m.id),
          );
        stale.forEach((m) => (m.avatar_url = avatarUrl));
        queryClient.invalidateQueries({ queryKey: ["players"] });
      }

      setMemberships(rows);
      setIsPlayerLoading(false);
    },
    [],
  );

  const refreshMemberships = useCallback(async () => {
    if (user) await fetchMemberships(user.id, avatarOf(user));
  }, [user, fetchMemberships]);

  // Stored club wins, but only while it is still one of yours — being removed
  // from a club should not leave the app pointing at data it can no longer read.
  const active =
    memberships.find((m) => m.club_id === storedClubId && m.status === "active") ??
    memberships.find((m) => m.status === "active") ??
    null;

  const setActiveClub = useCallback((clubId: number) => {
    localStorage.setItem(ACTIVE_CLUB_KEY, String(clubId));
    setStoredClubId(clubId);
    // Every cached query is scoped to the old club. Drop the lot rather than
    // flashing another club's ranking for a frame.
    queryClient.clear();
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user || null;
      setUser(currentUser);
      if (currentUser) {
        await fetchMemberships(currentUser.id, avatarOf(currentUser));
      }
      setIsLoading(false);
    };

    getUser();

    const { data } = supabase.auth.onAuthStateChange((_, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        setTimeout(
          () => fetchMemberships(currentUser.id, avatarOf(currentUser)),
          0,
        );
      } else {
        setMemberships([]);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [fetchMemberships]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        memberships,
        isPlayerLoading,
        activeClub: active?.club ?? null,
        activeClubId: active?.club_id ?? null,
        setActiveClub,
        player: active,
        refreshMemberships,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
