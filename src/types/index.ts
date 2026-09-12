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
 * The location columns (address, city, country, lat, lon) are written together
 * or not at all; see src/libs/algorithms/geocode.ts for the `Place` they come from.
 */
export type Club = Stamped<Row<"clubs">>;

/** The club's accent colour, keyed to a real Postgres enum so it stays in
 *  lockstep with the palette in libs/theme/clubTheme.ts. Ordered 1-8, the solids'
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

export const CATEGORIES = [1, 2, 3] as const satisfies readonly Category[];

/** 'pending' until the club owner decides. Rejecting sets 'rejected' rather
 *  than deleting the row: somebody who was turned down has to be told so, and
 *  told how to ask again — a missing row is indistinguishable from never having
 *  asked. 'left' is the member's own way out — also a status and not a delete,
 *  because games cascade from players and a game belongs to both sides. See
 *  PendingClubPanel and join_club/leave_club in sql/schema.sql. */
export type PlayerStatus = "pending" | "active" | "rejected" | "left";

/** The human. One row per person, however many clubs they play in — see
 *  sql/schema.sql. Name, face and public listing live here and nowhere else. */
export type Person = Row<"people">;

/** The five cue sports a table might be built for. Sizes are not shared
 *  across types — see TABLE_SIZES_BY_TYPE — a "7ft" American Pool table and a
 *  "7ft" English Pool table are different tables that happen to round to the
 *  same nominal length. */
export type TableType =
  | "american_pool"
  | "english_pool"
  | "snooker"
  | "carom"
  | "chinese_pool";

export const TABLE_TYPES: TableType[] = [
  "american_pool",
  "english_pool",
  "snooker",
  "carom",
  "chinese_pool",
];

/** Every size that appears under any type — which of these are valid for a
 *  given type is TABLE_SIZES_BY_TYPE, not this list on its own. */
export type TableSize = "6ft" | "7ft" | "8ft" | "9ft" | "10ft" | "12ft";

/** The size picker is empty until a type is chosen, then offers exactly this
 *  list, smallest first — the same set club_tables_type_size_check enforces
 *  in sql/schema.sql. */
export const TABLE_SIZES_BY_TYPE: Record<TableType, TableSize[]> = {
  american_pool: ["7ft", "8ft", "9ft"],
  english_pool: ["6ft", "7ft"],
  snooker: ["10ft", "12ft"],
  carom: ["10ft"],
  chinese_pool: ["9ft"],
};

/** One of the venue's tables. `label` is what is painted on the wall — "3",
 *  "Mesa 2", "Snooker" — so it is text and not a number, and unrelated to
 *  `type`/`size`/`brand`/`felt`, which are the room's own facts about the
 *  table. All of `type`, `size`, `brand`, `felt`, `map_x`, `map_y` and
 *  `map_rotation` are optional: existing tables have none of them, and
 *  nothing backfills them. `map_x`/`map_y`/`map_rotation` place the table on
 *  the floor plan — a table with no position simply hasn't been placed on it
 *  yet; see libs/algorithms/tableFloorPlan.ts. */
export type ClubTable = Omit<Row<"club_tables">, "type" | "size"> & {
  type: TableType | null;
  size: TableSize | null;
};

/**
 * A match being played right now.
 *
 * The row's existence is its status: live while it is here, finished once
 * `finish_live_match` has turned it into a `games` row and deleted it,
 * abandoned while it is here and nobody has touched it — see libs/algorithms/night.ts.
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
} & Pick<Person, "name" | "avatar_url" | "slug" | "is_public" | "country"> & {
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

/** Exactly one of game_id / drill_log_id / tournament_id is set — enforced by a
 *  CHECK. A tournament is the one target readable outside its club: it is what
 *  a public results page carries. */
export type SocialTarget =
  | { gameId: string }
  | { drillLogId: number }
  | { tournamentId: number };

export type Comment = Stamped<Row<"comments">>;

/** The picker's palette. The database accepts any emoji, so a row may carry
 *  one that is not on this list — render what is stored, not what is here. */
export const REACTIONS = [
  "👍",
  "👏",
  "🙌",
  "🔥",
  "🐐",
  "😮",
  "😂",
  "🎱",
] as const;
export type ReactionEmoji = (typeof REACTIONS)[number];

export type Reaction = Stamped<Row<"reactions">>;

// Training / Drills types
export type DrillDifficulty = "beginner" | "intermediate" | "advanced";
export type DrillSkillType =
  | "potting"
  | "position"
  | "safety"
  | "break"
  | "banks"
  | "kicks"
  | "patterns"
  | "specials";

export type BallPosition = {
  x: number;
  y: number;
  color: string;
  label?: string;
};

/**
 * A line, a circle or a rectangle, all in the one `shot_paths` array.
 *
 * Two points is enough for all three, so the shapes needed no new column and
 * no migration: no `shape` is the arrow every existing drill is made of, a
 * circle reads (x1,y1) as its centre and (x2,y2) as a point on its rim, and a
 * rectangle reads them as opposite corners. `type` stays the stroke, so a
 * dashed circle is a circle with `type: "dashed"`.
 */
export type ShotPath = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type?: "solid" | "dashed";
  shape?: "circle" | "rect";
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

export type TrainingPlanStepStatus = "pending" | "completed" | "skipped";

export type TrainingPlan = Row<"training_plans">;

export type TrainingPlanStep = Omit<Row<"training_plan_steps">, "status"> & {
  status: TrainingPlanStepStatus;
  /** Joined in by useTrainingPlan's select, not a column of its own. */
  drill?: Drill;
};

/** Which drills a division is aimed at. Used to seed a training plan. */
export const CATEGORY_TO_DIFFICULTY: Record<Category, DrillDifficulty> = {
  1: "advanced",
  2: "intermediate",
  3: "beginner",
};

/* Display order for the filters and the editor. The labels themselves live in
   src/i18n as `difficulty.${key}` and `skill.${key}`. */
/* `as const` so the literal types survive: the drills route builds its
   ?difficulty validator straight from this list, and a plain
   DrillDifficulty[] would widen the parsed value back to `string`. */
export const DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
] as const satisfies readonly DrillDifficulty[];

export const SKILL_TYPES = [
  "potting",
  "position",
  "safety",
  "break",
  "banks",
  "kicks",
  "patterns",
  "specials",
] as const satisfies readonly DrillSkillType[];

// Tournaments — see sql/schema.sql and libs/algorithms/bracket/.

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
  /** Joined by useTournament's select, not a column — the racks a league
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
