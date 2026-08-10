import type { Database } from "./database.types.gen";

/**
 * The app's types, derived from the generated schema rather than written twice.
 *
 * Regenerate the schema with `npm run db:types`. A column renamed or dropped in
 * a migration then becomes a build error here instead of `undefined` at runtime.
 *
 * Two kinds of narrowing sit on top, because a Postgres column is looser than
 * what the app actually stores in it:
 *
 *   - `text` columns holding a fixed set of words (status, difficulty) generate
 *     as `string`. The unions below are the real domain, and they are what the
 *     CHECK constraints enforce.
 *   - `jsonb` generates as `Json`. Only this app writes those columns, so their
 *     shape is known.
 *
 * Where a narrowing is a guess rather than a fact, it says so.
 */
type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

/**
 * `created_at` is `timestamptz DEFAULT now()` everywhere, but only some tables
 * declare it NOT NULL, so it generates as nullable on the rest. Nothing writes a
 * null, and re-narrowing here beats a `?? ""` at every render.
 *
 * ponytail: this is papering over the schema. The real fix is one migration —
 * `ALTER TABLE <t> ALTER COLUMN created_at SET NOT NULL` on clubs, games,
 * challenges, comments and reactions — after which this helper can go.
 */
type Stamped<T> = Omit<T, "created_at"> & { created_at: string };

export type Club = Stamped<Row<"clubs">>;

/** A real Postgres enum, so this one comes through already narrowed. */
export type GameMode = Database["public"]["Enums"]["GameMode"];

/** Scores are `bigint` columns: numbers, not strings. */
export type Game = Stamped<Row<"games">>;

export type Category = 1 | 2 | 3;

/** 'pending' until the club owner approves the join request. */
export type PlayerStatus = "pending" | "active";

/** A player row is also the membership row: one per (club, user). */
export type Player = Omit<Row<"players">, "category" | "status"> & {
  category: Category;
  status: PlayerStatus;
};

/** A Player joined to its club — what AuthContext lists for the switcher.
 *  `club` is null while the membership is still pending: RLS lets you see your
 *  own player row before it lets you see the club it belongs to. */
export type Membership = Player & { club: Club | null };

export type ChallengeStatus = "pending" | "accepted" | "declined" | "played";

export type Challenge = Omit<Stamped<Row<"challenges">>, "status"> & {
  status: ChallengeStatus;
};

/** Exactly one of game_id / drill_log_id is set — enforced by a CHECK. */
export type SocialTarget = { gameId: string } | { drillLogId: number };

export type Comment = Stamped<Row<"comments">>;

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

export type Reaction = Stamped<Row<"reactions">>;

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

/** ball_positions and shot_paths are jsonb — only the drill editor writes them,
 *  so the arrays below are their real shape rather than a guess. */
export type Drill = Omit<
  Row<"drills">,
  "difficulty" | "skill_type" | "ball_positions" | "shot_paths"
> & {
  difficulty: DrillDifficulty;
  skill_type: DrillSkillType;
  ball_positions: BallPosition[];
  shot_paths: ShotPath[];
};

export type DrillLog = Row<"drill_logs">;

export type TrainingPlanStepStatus = 'pending' | 'completed' | 'skipped';

export type TrainingPlan = Row<"training_plans">;

export type TrainingPlanStep = Omit<Row<"training_plan_steps">, "status"> & {
  status: TrainingPlanStepStatus;
  /** Joined in by useTrainingPlan's select, not a column of its own. */
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
