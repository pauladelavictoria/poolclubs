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

// Training / Drills types
export type DrillDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type DrillSkillType =
  | 'potting'
  | 'position'
  | 'safety'
  | 'break'
  | 'banks'
  | 'kicks'
  | 'patterns'
  | 'specials';

export type BallPosition = {
  x: number;
  y: number;
  color: string;
  label?: string;
};

export type ShotPath = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type?: 'solid' | 'dashed';
};

export type Drill = {
  id: number;
  name: string;
  description: string;
  difficulty: DrillDifficulty;
  skill_type: DrillSkillType;
  setup_instructions: string;
  scoring_method: string;
  max_score: number;
  ball_positions: BallPosition[];
  shot_paths: ShotPath[];
  created_at: string;
  created_by: string | null;
};

export type DrillLog = {
  id: number;
  drill_id: number;
  player_id: number;
  score: number;
  max_score: number;
  notes?: string;
  created_at: string;
};

export type TrainingPlanStepStatus = 'pending' | 'completed' | 'skipped';

export type TrainingPlan = {
  id: number;
  player_id: number;
  active: boolean;
  created_at: string;
};

export type TrainingPlanStep = {
  id: number;
  plan_id: number;
  drill_id: number;
  step_order: number;
  status: TrainingPlanStepStatus;
  drill_log_id?: number;
  created_at: string;
  drill?: Drill;
};

export const DIFFICULTY_TO_CATEGORY: Record<DrillDifficulty, Category> = {
  advanced: 1,
  intermediate: 2,
  beginner: 3,
};

export const CATEGORY_TO_DIFFICULTY: Record<Category, DrillDifficulty> = {
  1: 'advanced',
  2: 'intermediate',
  3: 'beginner',
};

export const DIFFICULTY_LABELS: Record<DrillDifficulty, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

export const SKILL_TYPE_LABELS: Record<DrillSkillType, string> = {
  potting: 'Embocada',
  position: 'Posición',
  safety: 'Defensa',
  break: 'Salida',
  banks: 'Bandas',
  kicks: 'Banda previa',
  patterns: 'Patrones',
  specials: 'Tiros especiales',
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
