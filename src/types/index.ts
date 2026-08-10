export type Club = {
  id: number;
  name: string;
  /** Secret half of the invite link. Only members can read it. */
  join_code: string;
  owner_id: string;
  created_at: string;
};

export type GameMode = 'single' | 'doubles';

export type Game = {
  user_id: number
  id: string;
  club_id: number;
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

/** 'pending' until the club owner approves the join request. */
export type PlayerStatus = 'pending' | 'active';

/** A player row is also the membership row: one per (club, user). */
export type Player = {
  id: number;
  name: string;
  category: Category;
  club_id: number;
  status: PlayerStatus;
  user_id: string | null;
  /** Copied from the OAuth profile on sign-in; NULL for guest players. */
  avatar_url: string | null;
};

/** A Player joined to its club — what AuthContext lists for the switcher.
 *  `club` is null while the membership is still pending: RLS lets you see your
 *  own player row before it lets you see the club it belongs to. */
export type Membership = Player & { club: Club | null };

export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'played';

export type Challenge = {
  id: number;
  club_id: number;
  from_player_id: number;
  to_player_id: number;
  status: ChallengeStatus;
  message: string | null;
  game_id: string | null;
  created_at: string;
};

/** Exactly one of game_id / drill_log_id is set — enforced by a CHECK. */
export type SocialTarget = { gameId: string } | { drillLogId: number };

export type Comment = {
  id: number;
  club_id: number;
  author_player_id: number;
  game_id: string | null;
  drill_log_id: number | null;
  body: string;
  created_at: string;
};

/** The picker's palette. The database accepts any emoji, so a row may carry
 *  one that is not on this list — render what is stored, not what is here. */
export const REACTIONS = [
  '👍',
  '👏',
  '🙌',
  '🔥',
  '🐐',
  '😮',
  '😂',
  '🎱',
] as const;
export type ReactionEmoji = (typeof REACTIONS)[number];

export type Reaction = {
  id: number;
  club_id: number;
  author_player_id: number;
  game_id: string | null;
  drill_log_id: number | null;
  emoji: string;
  created_at: string;
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

/** Which drills a division is aimed at. Used to seed a training plan. */
export const CATEGORY_TO_DIFFICULTY: Record<Category, DrillDifficulty> = {
  1: 'advanced',
  2: 'intermediate',
  3: 'beginner',
};

/* Display order for the filters and the editor. The labels themselves live in
   src/i18n as `difficulty.${key}` and `skill.${key}`. */
export const DIFFICULTIES: DrillDifficulty[] = [
  'beginner',
  'intermediate',
  'advanced',
];

export const SKILL_TYPES: DrillSkillType[] = [
  'potting',
  'position',
  'safety',
  'break',
  'banks',
  'kicks',
  'patterns',
  'specials',
];

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
