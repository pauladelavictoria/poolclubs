export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      challenges: {
        Row: {
          club_id: number
          created_at: string | null
          from_player_id: number
          game_id: string | null
          id: number
          message: string | null
          status: string
          to_player_id: number
        }
        Insert: {
          club_id: number
          created_at?: string | null
          from_player_id: number
          game_id?: string | null
          id?: number
          message?: string | null
          status?: string
          to_player_id: number
        }
        Update: {
          club_id?: number
          created_at?: string | null
          from_player_id?: number
          game_id?: string | null
          id?: number
          message?: string | null
          status?: string
          to_player_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenges_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_from_player_id_fkey"
            columns: ["from_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_to_player_id_fkey"
            columns: ["to_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          id: number
          is_public: boolean
          join_code: string
          lat: number | null
          logo_url: string | null
          lon: number | null
          member_count: number
          name: string
          owner_id: string
          slug: string
          theme_color: Database["public"]["Enums"]["BallColor"]
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: number
          is_public?: boolean
          join_code?: string
          lat?: number | null
          logo_url?: string | null
          lon?: number | null
          member_count?: number
          name: string
          owner_id: string
          slug: string
          theme_color?: Database["public"]["Enums"]["BallColor"]
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: number
          is_public?: boolean
          join_code?: string
          lat?: number | null
          logo_url?: string | null
          lon?: number | null
          member_count?: number
          name?: string
          owner_id?: string
          slug?: string
          theme_color?: Database["public"]["Enums"]["BallColor"]
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_player_id: number
          body: string
          club_id: number
          created_at: string | null
          drill_log_id: number | null
          game_id: string | null
          id: number
        }
        Insert: {
          author_player_id: number
          body: string
          club_id: number
          created_at?: string | null
          drill_log_id?: number | null
          game_id?: string | null
          id?: number
        }
        Update: {
          author_player_id?: number
          body?: string
          club_id?: number
          created_at?: string | null
          drill_log_id?: number | null
          game_id?: string | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_player_id_fkey"
            columns: ["author_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_drill_log_id_fkey"
            columns: ["drill_log_id"]
            isOneToOne: false
            referencedRelation: "drill_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      drill_logs: {
        Row: {
          created_at: string
          drill_id: number
          id: number
          max_score: number
          notes: string | null
          player_id: number
          score: number
        }
        Insert: {
          created_at?: string
          drill_id: number
          id?: number
          max_score: number
          notes?: string | null
          player_id: number
          score: number
        }
        Update: {
          created_at?: string
          drill_id?: number
          id?: number
          max_score?: number
          notes?: string | null
          player_id?: number
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "drill_logs_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drill_logs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      drills: {
        Row: {
          ball_positions: Json
          club_id: number | null
          created_at: string
          created_by: string | null
          description: string
          difficulty: string
          id: number
          max_score: number
          name: string
          scoring_method: string
          setup_instructions: string
          shot_paths: Json
          skill_type: string
        }
        Insert: {
          ball_positions?: Json
          club_id?: number | null
          created_at?: string
          created_by?: string | null
          description: string
          difficulty: string
          id?: number
          max_score: number
          name: string
          scoring_method: string
          setup_instructions: string
          shot_paths?: Json
          skill_type: string
        }
        Update: {
          ball_positions?: Json
          club_id?: number | null
          created_at?: string
          created_by?: string | null
          description?: string
          difficulty?: string
          id?: number
          max_score?: number
          name?: string
          scoring_method?: string
          setup_instructions?: string
          shot_paths?: Json
          skill_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "drills_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          club_id: number
          created_at: string | null
          discipline: Database["public"]["Enums"]["Discipline"]
          id: string
          mode: Database["public"]["Enums"]["GameMode"]
          player_1_id: number
          player_1_score: number
          player_1b_id: number | null
          player_2_id: number
          player_2_score: number
          player_2b_id: number | null
        }
        Insert: {
          club_id: number
          created_at?: string | null
          discipline?: Database["public"]["Enums"]["Discipline"]
          id?: string
          mode?: Database["public"]["Enums"]["GameMode"]
          player_1_id: number
          player_1_score: number
          player_1b_id?: number | null
          player_2_id: number
          player_2_score: number
          player_2b_id?: number | null
        }
        Update: {
          club_id?: number
          created_at?: string | null
          discipline?: Database["public"]["Enums"]["Discipline"]
          id?: string
          mode?: Database["public"]["Enums"]["GameMode"]
          player_1_id?: number
          player_1_score?: number
          player_1b_id?: number | null
          player_2_id?: number
          player_2_score?: number
          player_2b_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "games_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_player_1_id_fkey"
            columns: ["player_1_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_player_1b_id_fkey"
            columns: ["player_1b_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_player_2_id_fkey"
            columns: ["player_2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_player_2b_id_fkey"
            columns: ["player_2b_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          avatar_url: string | null
          id: number
          is_public: boolean
          name: string
          slug: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          id?: number
          is_public?: boolean
          name: string
          slug: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          id?: number
          is_public?: boolean
          name?: string
          slug?: string
          user_id?: string | null
        }
        Relationships: []
      }
      players: {
        Row: {
          category: number
          club_id: number
          id: number
          person_id: number
          status: string
        }
        Insert: {
          category?: number
          club_id: number
          id?: number
          person_id: number
          status?: string
        }
        Update: {
          category?: number
          club_id?: number
          id?: number
          person_id?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          author_player_id: number
          club_id: number
          created_at: string | null
          drill_log_id: number | null
          emoji: string
          game_id: string | null
          id: number
        }
        Insert: {
          author_player_id: number
          club_id: number
          created_at?: string | null
          drill_log_id?: number | null
          emoji: string
          game_id?: string | null
          id?: number
        }
        Update: {
          author_player_id?: number
          club_id?: number
          created_at?: string | null
          drill_log_id?: number | null
          emoji?: string
          game_id?: string | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "reactions_author_player_id_fkey"
            columns: ["author_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_drill_log_id_fkey"
            columns: ["drill_log_id"]
            isOneToOne: false
            referencedRelation: "drill_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          bracket: string
          game_id: string | null
          group_no: number | null
          id: string
          loser_to: string | null
          loser_to_slot: number | null
          p1_id: number | null
          p2_id: number | null
          round: number
          slot: number
          tournament_id: number
          winner_id: number | null
          winner_to: string | null
          winner_to_slot: number | null
        }
        Insert: {
          bracket: string
          game_id?: string | null
          group_no?: number | null
          id: string
          loser_to?: string | null
          loser_to_slot?: number | null
          p1_id?: number | null
          p2_id?: number | null
          round: number
          slot: number
          tournament_id: number
          winner_id?: number | null
          winner_to?: string | null
          winner_to_slot?: number | null
        }
        Update: {
          bracket?: string
          game_id?: string | null
          group_no?: number | null
          id?: string
          loser_to?: string | null
          loser_to_slot?: number | null
          p1_id?: number | null
          p2_id?: number | null
          round?: number
          slot?: number
          tournament_id?: number
          winner_id?: number | null
          winner_to?: string | null
          winner_to_slot?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_loser_to_fkey"
            columns: ["loser_to"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_p1_id_fkey"
            columns: ["p1_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_p2_id_fkey"
            columns: ["p2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_to_fkey"
            columns: ["winner_to"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_players: {
        Row: {
          created_at: string
          player_id: number
          tournament_id: number
        }
        Insert: {
          created_at?: string
          player_id: number
          tournament_id: number
        }
        Update: {
          created_at?: string
          player_id?: number
          tournament_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournament_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_players_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          advance: number | null
          category: number | null
          club_id: number
          created_at: string
          discipline: Database["public"]["Enums"]["Discipline"]
          format: string
          id: number
          legs: number
          name: string
          race_final: number | null
          race_semi: number | null
          race_to: number
          status: string
        }
        Insert: {
          advance?: number | null
          category?: number | null
          club_id: number
          created_at?: string
          discipline?: Database["public"]["Enums"]["Discipline"]
          format: string
          id?: number
          legs?: number
          name: string
          race_final?: number | null
          race_semi?: number | null
          race_to?: number
          status?: string
        }
        Update: {
          advance?: number | null
          category?: number | null
          club_id?: number
          created_at?: string
          discipline?: Database["public"]["Enums"]["Discipline"]
          format?: string
          id?: number
          legs?: number
          name?: string
          race_final?: number | null
          race_semi?: number | null
          race_to?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plan_steps: {
        Row: {
          created_at: string
          drill_id: number
          drill_log_id: number | null
          id: number
          plan_id: number
          status: string
          step_order: number
        }
        Insert: {
          created_at?: string
          drill_id: number
          drill_log_id?: number | null
          id?: number
          plan_id: number
          status?: string
          step_order: number
        }
        Update: {
          created_at?: string
          drill_id?: number
          drill_log_id?: number | null
          id?: number
          plan_id?: number
          status?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_plan_steps_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plan_steps_drill_log_id_fkey"
            columns: ["drill_log_id"]
            isOneToOne: false
            referencedRelation: "drill_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plan_steps_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plans: {
        Row: {
          active: boolean
          created_at: string
          id: number
          player_id: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: number
          player_id: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: number
          player_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_guest_player: {
        Args: { cat?: number; cid: number; pname: string }
        Returns: number
      }
      can_touch_plan: { Args: { pid: number }; Returns: boolean }
      can_touch_player: { Args: { pid: number }; Returns: boolean }
      club_preview: {
        Args: { code: string }
        Returns: {
          claimable: boolean
          club_id: number
          club_name: string
          player_id: number
          player_name: string
        }[]
      }
      club_slug_reserved: { Args: never; Returns: string[] }
      create_club: { Args: { club_name: string }; Returns: number }
      is_club_admin: { Args: { cid: number }; Returns: boolean }
      is_club_member: { Args: { cid: number }; Returns: boolean }
      is_drill_admin: { Args: never; Returns: boolean }
      is_own_player: { Args: { pid: number }; Returns: boolean }
      is_public_club: { Args: { cid: number }; Returns: boolean }
      join_club: {
        Args: { claim_player_id?: number; code: string; display_name?: string }
        Returns: number
      }
      person_in_public_club: { Args: { pid: number }; Returns: boolean }
      person_is_admins_guest: { Args: { pid: number }; Returns: boolean }
      person_shares_club: { Args: { pid: number }; Returns: boolean }
      slugify: { Args: { txt: string }; Returns: string }
      tournament_club: { Args: { tid: number }; Returns: number }
    }
    Enums: {
      BallColor:
        | "yellow"
        | "blue"
        | "red"
        | "purple"
        | "orange"
        | "green"
        | "maroon"
        | "black"
      Discipline: "8ball" | "9ball" | "10ball"
      GameMode: "single" | "doubles"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      BallColor: [
        "yellow",
        "blue",
        "red",
        "purple",
        "orange",
        "green",
        "maroon",
        "black",
      ],
      Discipline: ["8ball", "9ball", "10ball"],
      GameMode: ["single", "doubles"],
    },
  },
} as const
