import { supabase } from "@/supabaseClient";
// import { useAuth } from "./useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Game } from "@/types";

export const useGetGames = () => {
  // const { user } = useAuth();
  const queryClient = useQueryClient();

  async function fetchGames() {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data as Game[];
  }

  useEffect(() => {
    // if (!user) return;

    const eventsChannel = supabase
      .channel("games-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "games",
          // filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("INSERT received:", payload);
          queryClient.setQueryData<Game[]>(["games"], (oldData = []) => {
            return [payload.new as Game, ...oldData];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          // filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("UPDATE received:", payload);
          queryClient.setQueryData<Game[]>(["games"], (oldData = []) => {
            return oldData.map((game) =>
              game.id === payload.new.id ? (payload.new as Game) : game
            );
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "games",
          // No filter on user_id because the line is already deleted
        },
        (payload) => {
          console.log("DELETE received:", payload);
          // Check if the deleted game is in our list before updating
          queryClient.setQueryData<Game[]>(["games"], (oldData = []) => {
            return oldData.filter((game) => game.id !== payload.old.id);
          });
        }
      )
      .subscribe();

    // Cleaning
    return () => {
      console.log("Cleaning real-time subscriptions");
      supabase.removeChannel(eventsChannel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["games"],
    queryFn: fetchGames,
    // enabled: !!user,
  });
};
