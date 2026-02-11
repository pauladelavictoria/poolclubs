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
                racksWon: number; // Total racks won
                category: Category;
                name: string;
            }
        >();

        for (const player of players) {
            playerStats.set(player.id, {
                rating: INITIAL_RATING,
                gamesPlayed: 0,
                gamesWon: 0,
                racksPlayed: 0,
                racksWon: 0,
                category: player.category,
                name: player.name,
            });
        }

        // Sort games chronologically to ensure correct ELO evolution
        const sortedGames = [...games].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        for (const game of sortedGames) {
            const { player_1_id, player_2_id, player_1_score, player_2_score } = game;
            const s1 = Number(player_1_score);
            const s2 = Number(player_2_score);

            if (Number.isNaN(s1) || Number.isNaN(s2)) continue;

            const p1Stats = playerStats.get(player_1_id);
            const p2Stats = playerStats.get(player_2_id);

            if (!p1Stats || !p2Stats) continue;

            // Update basic stats
            p1Stats.gamesPlayed += 1;
            p2Stats.gamesPlayed += 1;
            p1Stats.racksPlayed += s1 + s2;
            p2Stats.racksPlayed += s1 + s2;
            p1Stats.racksWon += s1;
            p2Stats.racksWon += s2;

            if (s1 > s2) p1Stats.gamesWon += 1;
            if (s2 > s1) p2Stats.gamesWon += 1;

            // ELO Calculation
            // Probability of P1 winning a single rack:
            // P1 = 1 / (1 + 2 ^ ((R2 - R1) / 100))
            const r1 = p1Stats.rating;
            const r2 = p2Stats.rating;

            const expectedScorePercentage1 = 1 / (1 + Math.pow(2, (r2 - r1) / SCALE_FACTOR));
            const expectedScorePercentage2 = 1 / (1 + Math.pow(2, (r1 - r2) / SCALE_FACTOR));

            // Actual score for the MATCH (sum of racks)
            // We treat the match as (s1 + s2) partial updates or one batched update
            // Batched update:
            // Delta = K * (ActualPoints - ExpectedPoints)
            // ExpectedPoints = TotalRacks * ExpectedScorePercentage

            const totalRacks = s1 + s2;
            const expectedPoints1 = totalRacks * expectedScorePercentage1;
            const expectedPoints2 = totalRacks * expectedScorePercentage2;

            // Determine K-Factor based on experience (racks played)
            // Use the average K if they cross the threshold during these racks? Just use current state.
            // We use the player's own K factor for their update.
            const k1 = p1Stats.racksPlayed <= 100 ? K_PROVISIONAL : K_ESTABLISHED;
            const k2 = p2Stats.racksPlayed <= 100 ? K_PROVISIONAL : K_ESTABLISHED;

            const delta1 = k1 * (s1 - expectedPoints1);
            const delta2 = k2 * (s2 - expectedPoints2);

            p1Stats.rating += delta1;
            p2Stats.rating += delta2;
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
            }))
            .filter((p) => p.gamesPlayed > 0)
            .sort((a, b) => b.gamesPlayed - a.gamesPlayed) // Sort by games played
            .sort((a, b) => b.points - a.points) // Sort by rating

        return entries.length > 0 ? entries : null;
    }, [games, players]);
};
