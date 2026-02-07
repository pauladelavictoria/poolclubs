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
}

export type Player = {
  id: number;
  name: string;
}
