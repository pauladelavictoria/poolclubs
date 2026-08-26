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

/**
 * `slug` is intersected in rather than read from the generated Row because the
 * app is typed against it before `sql/club-slug.sql` has been applied and
 * `npm run db:types` re-run. The intersection is harmless once the column is
 * generated — it is the same `string` — so this line does not need removing,
 * but it can go once the schema catches up.
 *
 * The location columns (address, city, country, lat, lon) are written together
 * or not at all; see src/libs/geocode.ts for the `Place` they come from.
 */
export type Club = Stamped<Row<"clubs">> & { slug: string };

/** The club's accent colour, keyed to a real Postgres enum so it stays in
 *  lockstep with the palette in libs/clubTheme.ts. Ordered 1-8, the solids'
 *  own rack order — the picker and any legend read in that order too. */
export type BallColor = Database["public"]["Enums"]["BallColor"];

export const CLUB_BALL_COLORS: BallColor[] = [
  "yellow",
  "blue",
  "red",
  "purple",
  "orange",
  "green",
  "maroon",
  "black",
];

/** Real Postgres enums, so these come through already narrowed. */
export type GameMode = Database["public"]["Enums"]["GameMode"];

/** Which game is on the table. Labels live in src/i18n as `discipline.${key}`. */
export type Discipline = Database["public"]["Enums"]["Discipline"];

export const DISCIPLINES: Discipline[] = ["8ball", "9ball", "10ball"];

/** Scores are `bigint` columns: numbers, not strings. */
export type Game = Stamped<Row<"games">>;

export type Category = 1 | 2 | 3;

/** 'pending' until the club owner approves the join request. */
export type PlayerStatus = "pending" | "active";

/** The human. One row per person, however many clubs they play in — see
 *  sql/people.sql. Name, face and public listing live here and nowhere else. */
export type Person = Row<"people">;

/** One of the venue's tables. `label` is what is painted on the wall — "3",
 *  "Mesa 2", "Snooker" — so it is text and not a number. */
export type ClubTable = Row<"club_tables">;

/**
 * A match being played right now.
 *
 * The row's existence is its status: live while it is here, finished once
 * `finish_live_match` has turned it into a `games` row and deleted it,
 * abandoned while it is here and nobody has touched it — see libs/night.ts.
 * The four seats, `mode` and `discipline` are the same shape as a game, because
 * finishing copies them straight across.
 *
 * `last_side` is a smallint holding 1 or 2 — narrowed here for the same reason
 * the status columns below are: the CHECK is the real domain and the generated
 * type is looser than what is ever stored.
 */
export type LiveMatch = Omit<Row<"live_matches">, "last_side"> & {
  /** Which side scored the last rack. What undo reads — two counters alone
   *  cannot say, so undo on the other phone would guess. */
  last_side: 1 | 2 | null;
};

export type Player = Omit<Row<"players">, "category" | "status"> & {
  category: Category;
  status: PlayerStatus;
} & {
    /** Which table this tablet is paired to, when it is one. Intersected in
     *  rather than read from the generated Row until sql/device-pairing.sql is
     *  applied and `npm run db:types` re-run; harmless once it is. */
    device_table_id: number | null;
  } & Pick<Person, "name" | "avatar_url" | "slug" | "is_public"> & {
    /** Null out here on the public side, where anon is not granted the column.
     *  Only ClubPage reads it, to mark which member owns the club. */
    user_id: string | null;
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
/* `as const` so the literal types survive: the drills route builds its
   ?difficulty validator straight from this list, and a plain
   DrillDifficulty[] would widen the parsed value back to `string`. */
export const DIFFICULTIES = [
  'beginner',
  'intermediate',
  'advanced',
] as const satisfies readonly DrillDifficulty[];

export const SKILL_TYPES = [
  'potting',
  'position',
  'safety',
  'break',
  'banks',
  'kicks',
  'patterns',
  'specials',
] as const satisfies readonly DrillSkillType[];

// Tournaments — see sql/tournaments.sql and libs/bracket.ts.

export type TournamentFormat = "double_elim" | "league" | "group_knockout";

/** 'groups' is a group_knockout waiting for its bracket to be cut: the group
 *  phase is generated, the knockout half is not, because the qualifiers aren't
 *  known until the last group match is played. */
export type TournamentStatus = "open" | "groups" | "running" | "done";

export type BracketSide = "group" | "winners" | "losers" | "final" | "league";

/** The column is snake_case, the i18n keys are camelCase. Labels live in
 *  src/i18n as `tournaments.${key}` and `tournaments.hint.${format}`. */
export const FORMAT_KEY: Record<
  TournamentFormat,
  "doubleElim" | "league" | "groupKnockout"
> = {
  double_elim: "doubleElim",
  league: "league",
  group_knockout: "groupKnockout",
};

export type Tournament = Omit<
  Row<"tournaments">,
  "format" | "status" | "category" | "legs"
> & {
  /* discipline, race_to, race_semi and race_final come through as they are —
     the enum is narrowed by Postgres and the races are plain numbers. */
  format: TournamentFormat;
  status: TournamentStatus;
  /** null = combined, every division. */
  category: Category | null;
  /** Times each pair meets in a league or inside a group. */
  legs: 1 | 2;
};

export type TournamentPlayer = Row<"tournament_players">;

export type TournamentMatch = Omit<Row<"tournament_matches">, "bracket"> & {
  bracket: BracketSide;
  /** Joined by useGetTournament's select, not a column — the racks a league
   *  table needs live on the game, not the match, and so does when it was
   *  played: a match row has no time of its own because a fixture is not an
   *  event until somebody turns up. */
  game?: Pick<
    Game,
    "player_1_id" | "player_1_score" | "player_2_score" | "played_at"
  > | null;
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
