import { useMemo } from "react";
import type { Game, Player, DailyRankingEntry, Category } from "@/types";

const INITIAL_RATING = 500;
const SCALE_FACTOR = 100;
// K-Factors for different experience levels (in total racks played)
const K_PROVISIONAL = 20; // First 100 racks
const K_ESTABLISHED = 10; // After 100 racks

export const useEloRanking = ({
    games,
    players,
}: {
    games?: Game[];
    players?: Player[];
}): DailyRankingEntry[] | null => {
    return useMemo(() => {
        if (!players || !games || games.length === 0) return null;

        // Initialize ratings
        const playerStats = new Map<
            number,
            {
                rating: number;
                gamesPlayed: number; // Matches played
                gamesWon: number; // Matches won
                racksPlayed: number; // Total racks (points) played
                category: Category;
                name: string;
                last10Games: boolean[];
                racksLosed: number;
                racksWon: number;
            }
        >();

        for (const player of players) {
            playerStats.set(player.id, {
                rating: INITIAL_RATING,
                gamesPlayed: 0,
                gamesWon: 0,
                racksPlayed: 0,
                category: player.category,
                name: player.name,
                last10Games: new Array(10).fill(false),
                racksLosed: 0,
                racksWon: 0,
            });
        }

        // Sort games chronologically to ensure correct ELO evolution
        const sortedGames = [...games].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        for (const game of sortedGames) {
            const {
                player_1_id,
                player_2_id,
                player_1b_id,
                player_2b_id,
                mode,
                player_1_score,
                player_2_score,
            } = game;

            const isDoubles = mode === "doubles";
            const s1 = Number(player_1_score);
            const s2 = Number(player_2_score);

            if (Number.isNaN(s1) || Number.isNaN(s2)) continue;

            const p1aStats = playerStats.get(player_1_id);
            const p1bStats = isDoubles && player_1b_id ? playerStats.get(player_1b_id) : null;
            const p2aStats = playerStats.get(player_2_id);
            const p2bStats = isDoubles && player_2b_id ? playerStats.get(player_2b_id) : null;

            if (!p1aStats || !p2aStats) continue;

            const team1 = [p1aStats, p1bStats].filter(Boolean) as NonNullable<typeof p1aStats>[];
            const team2 = [p2aStats, p2bStats].filter(Boolean) as NonNullable<typeof p2aStats>[];

            // Update basic stats for everyone in the match
            for (const p of team1) {
                p.gamesPlayed += 1;
                p.racksPlayed += s1 + s2;
                p.racksWon += s1;
                p.racksLosed += s2;
                if (s1 > s2) p.gamesWon += 1;
                p.last10Games.push(s1 > s2);
                if (p.last10Games.length > 10) p.last10Games.shift();
            }
            for (const p of team2) {
                p.gamesPlayed += 1;
                p.racksPlayed += s1 + s2;
                p.racksWon += s2;
                p.racksLosed += s1;
                if (s2 > s1) p.gamesWon += 1;
                p.last10Games.push(s2 > s1);
                if (p.last10Games.length > 10) p.last10Games.shift();
            }

            // ELO Calculation
            const r1 = team1.reduce((sum, p) => sum + p.rating, 0) / team1.length;
            const r2 = team2.reduce((sum, p) => sum + p.rating, 0) / team2.length;

            const expectedScorePercentage1 = 1 / (1 + Math.pow(2, (r2 - r1) / SCALE_FACTOR));
            const expectedScorePercentage2 = 1 / (1 + Math.pow(2, (r1 - r2) / SCALE_FACTOR));

            const totalRacks = s1 + s2;
            const expectedPoints1 = totalRacks * expectedScorePercentage1;
            const expectedPoints2 = totalRacks * expectedScorePercentage2;

            // Apply ELO update to each individual player based on their own K-factor
            for (const p of team1) {
                const k = p.racksPlayed <= 100 ? K_PROVISIONAL : K_ESTABLISHED;
                p.rating += k * (s1 - expectedPoints1);
            }
            for (const p of team2) {
                const k = p.racksPlayed <= 100 ? K_PROVISIONAL : K_ESTABLISHED;
                p.rating += k * (s2 - expectedPoints2);
            }
        }

        // Convert to DailyRankingEntry format
        const entries: DailyRankingEntry[] = Array.from(playerStats.entries())
            .map(([id, stats]) => ({
                playerId: id,
                playerName: stats.name,
                category: stats.category,
                points: Math.round(stats.rating), // Display rating as "points"
                gamesPlayed: stats.gamesPlayed,
                gamesWon: stats.gamesWon,
                last10Games: stats.last10Games.reverse(),
                racksLosed: stats.racksLosed,
                racksWon: stats.racksWon,
            }))
            .filter((p) => p.gamesPlayed > 0)
            .sort((a, b) => {
                if (a.points !== b.points) {
                    return b.points - a.points; // Sort by points
                }
                if (a.gamesWon !== b.gamesWon) {
                    return b.gamesWon - a.gamesWon; // Sort by games won
                }
                return (b.racksWon - b.racksLosed) - (a.racksWon - a.racksLosed); // Sort by difference of racks won and lost
            })

        return entries.length > 0 ? entries : null;
    }, [games, players]);
};
