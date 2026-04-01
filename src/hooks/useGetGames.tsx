import { supabase } from "@/supabaseClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Game, GameMode } from "@/types";

export type UseGetGamesFilters = {
  date?: string; // ISO date string (e.g. "2025-02-08")
  page?: number; // 1-based page number
  pageSize?: number; // items per page
  playerName?: string; // filter games where this player is player_1_name, player_2_name, player_1b_name or player_2b_name
  category?: number; // filter games where either player belongs to this category
  mode?: GameMode;
};

const getDateRange = (date: string) => {
  const dateClean = date.split("T")[0];
  return {
    from: `${dateClean}T00:00:00.000Z`,
    to: `${dateClean}T23:59:59.999Z`,
  };
};

export const useGetGames = (filters?: UseGetGamesFilters) => {
  const {
    date,
    page = 1,
    pageSize,
    playerName,
    category,
    mode,
  } = filters ?? {};
  const queryClient = useQueryClient();

  async function fetchGames() {
    let query = supabase
      .from("games")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (mode) {
      query = query.eq("mode", mode);
    }

    if (date) {
      const { from, to } = getDateRange(date);
      query = query.gte("created_at", from);
      query = query.lte("created_at", to);
    }

    if (playerName) {
      const escaped = `"${playerName.replace(/"/g, '\\"')}"`;
      query = query.or(
        `player_1_name.eq.${escaped},player_2_name.eq.${escaped},player_1b_name.eq.${escaped},player_2b_name.eq.${escaped}`,
      );
    }

    // For category filtering, we need to fetch and filter client-side
    // since we need to join with players table
    if (category) {
      // First get the players in the category
      const { data: playersInCategory } = await supabase
        .from("players")
        .select("name")
        .eq("category", category);

      if (playersInCategory && playersInCategory.length > 0) {
        const playerNames = playersInCategory.map((p) => p.name);
        // Filter games where either player is in the category
        const conditions = playerNames
          .map((name) => {
            const escaped = `"${name.replace(/"/g, '\\"')}"`;
            return `player_1_name.eq.${escaped},player_2_name.eq.${escaped},player_1b_name.eq.${escaped},player_2b_name.eq.${escaped}`;
          })
          .join(",");
        query = query.or(conditions);
      } else {
        // No players in this category, return empty
        return { games: [], totalCount: 0 };
      }
    }

    if (page >= 1 && pageSize && pageSize >= 1) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error(error);
      throw error;
    }

    return {
      games: (data ?? []) as Game[],
      totalCount: count ?? null,
    };
  }

  useEffect(() => {
    const invalidateGames = () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
    };

    const gamesChannel = supabase
      .channel("games-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "games" },
        invalidateGames
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games" },
        invalidateGames
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "games" },
        invalidateGames
      )
      .subscribe();

    // Cleaning
    return () => {
      supabase.removeChannel(gamesChannel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["games", date, page, pageSize, playerName, category, mode],
    queryFn: fetchGames,
  });
};
