import { supabase } from "@/supabaseClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Game } from "@/types";

export type UseGetGamesFilters = {
  date?: string; // ISO date string (e.g. "2025-02-08")
  page?: number; // 1-based page number
  pageSize?: number; // items per page
  playerName?: string; // filter games where this player is player_1 or player_2
};

const getDateRange = (date: string) => {
  const dateClean = date.split("T")[0];
  return {
    from: `${dateClean}T00:00:00.000Z`,
    to: `${dateClean}T23:59:59.999Z`,
  };
};

export const useGetGames = (filters?: UseGetGamesFilters) => {
  const { date, page = 1, pageSize = 1000, playerName } = filters ?? {};
  const queryClient = useQueryClient();

  async function fetchGames() {
    let query = supabase
      .from("games")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (date) {
      const { from, to } = getDateRange(date);
      query = query.gte("created_at", from);
      query = query.lte("created_at", to);
    }

    if (playerName) {
      const escaped = `"${playerName.replace(/"/g, '\\"')}"`;
      query = query.or(
        `player_1_name.eq.${escaped},player_2_name.eq.${escaped}`
      );
    }

    if (page >= 1 && pageSize >= 1) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      games: (data ?? []) as Game[],
      totalCount: count ?? null,
    };
  }

  useEffect(() => {
    const gamesChannel = supabase
      .channel("games-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "games",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["games"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["games"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "games",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["games"] });
        }
      )
      .subscribe();

    // Cleaning
    return () => {
      supabase.removeChannel(gamesChannel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["games", date, page, pageSize, playerName],
    queryFn: fetchGames,
  });
};
