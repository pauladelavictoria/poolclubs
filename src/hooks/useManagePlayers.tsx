import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import type { Player, Category } from "@/types";

export type CreatePlayerInput = {
    name: string;
    category: Category;
};

export type UpdatePlayerInput = {
    id: number;
    name?: string;
    category?: Category;
};

export const useManagePlayers = () => {
    const queryClient = useQueryClient();

    const createPlayer = useMutation({
        mutationFn: async (newPlayer: CreatePlayerInput) => {
            console.log('newPlayer', newPlayer);
            const { data, error } = await supabase
                .from("players")
                .insert([newPlayer])
                .select()
                .single();

            if (error) throw error;
            return data as Player;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["players"] });
        },
    });

    const updatePlayer = useMutation({
        mutationFn: async ({ id, ...updates }: UpdatePlayerInput) => {
            console.log('updatePlayer', id, updates);
            const { data, error } = await supabase
                .from("players")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data as Player;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["players"] });
        },
    });

    const deletePlayer = useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase.from("players").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["players"] });
        },
    });

    return {
        createPlayer,
        updatePlayer,
        deletePlayer,
    };
};
