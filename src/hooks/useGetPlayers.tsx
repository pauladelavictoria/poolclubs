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
    const eventsChannel = supabase
      .channel("players-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "players",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["players"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["players"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "players",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["players"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["players"],
    queryFn: fetchPlayers,
    // enabled: !!user,
  });
};
