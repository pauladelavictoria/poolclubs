export type GameMode = 'single' | 'doubles';

export type Game = {
  user_id: number
  id: string;
  player_1_id: number;
  player_2_id: number;
  player_1_name: string;
  player_2_name: string;
  player_1_score: string;
  player_2_score: string;
  created_at: string;
  mode: GameMode;
  player_1b_id?: number;
  player_1b_name?: string;
  player_2b_id?: number;
  player_2b_name?: string;
}

export type Category = 1 | 2 | 3;

export type Player = {
  id: number;
  name: string;
  category: Category;
};

export type DailyRankingEntry = {
  playerId: number;
  playerName: string;
  category: Category;
  points: number;
  gamesPlayed: number;
  gamesWon: number;
  last10Games: boolean[];
  racksLosed: number;
  racksWon: number;
};
