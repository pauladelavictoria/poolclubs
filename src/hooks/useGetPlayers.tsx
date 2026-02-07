import { supabase } from "@/supabaseClient";
// import { useAuth } from "./useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Player } from "@/types";

export const useGetPlayers = () => {
  // const { user } = useAuth();
  const queryClient = useQueryClient();

  async function fetchPlayers() {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order('name')

    if (error) throw error;

    return data as Player[];
  }

  useEffect(() => {
    // if (!user) return;

    const eventsChannel = supabase
      .channel("players-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "players",
        },
        (payload) => {
          console.log("INSERT received:", payload);
          queryClient.setQueryData<Player[]>(["players"], (oldData = []) => {
            return [payload.new as Player, ...oldData];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
        },
        (payload) => {
          console.log("UPDATE received:", payload);
          queryClient.setQueryData<Player[]>(["players"], (oldData = []) => {
            return oldData.map((player) =>
              player.id === payload.new.id ? (payload.new as Player) : player
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
          // Check if the deleted player is in our list before updating
          queryClient.setQueryData<Player[]>(["players"], (oldData = []) => {
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
    queryKey: ["players"],
    queryFn: fetchPlayers,
    // enabled: !!user,
  });
};
