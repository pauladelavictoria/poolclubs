-- =============================================
-- Migration: Training / Drills Feature
-- =============================================

-- 1. Drill catalog
CREATE TABLE drills (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  skill_type TEXT NOT NULL CHECK (skill_type IN ('potting', 'position', 'safety', 'break', 'banks', 'kicks', 'patterns', 'specials')),
  setup_instructions TEXT NOT NULL,
  scoring_method TEXT NOT NULL,
  max_score INTEGER NOT NULL,
  ball_positions JSONB NOT NULL DEFAULT '[]',
  shot_paths JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. User drill results
CREATE TABLE drill_logs (
  id SERIAL PRIMARY KEY,
  drill_id INTEGER NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_drill_logs_player ON drill_logs(player_id);
CREATE INDEX idx_drill_logs_drill ON drill_logs(drill_id);

-- 3. Training plans
CREATE TABLE training_plans (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_plans_player ON training_plans(player_id);

-- 4. Training plan steps
CREATE TABLE training_plan_steps (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  drill_id INTEGER NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  drill_log_id INTEGER REFERENCES drill_logs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, step_order)
);

CREATE INDEX idx_training_plan_steps_plan ON training_plan_steps(plan_id);

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE drills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drills are viewable by everyone" ON drills FOR SELECT USING (true);

ALTER TABLE drill_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drill logs are viewable by everyone" ON drill_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert drill logs" ON drill_logs FOR INSERT WITH CHECK (true);

ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Training plans are viewable by everyone" ON training_plans FOR SELECT USING (true);
CREATE POLICY "Anyone can insert training plans" ON training_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update training plans" ON training_plans FOR UPDATE USING (true);

ALTER TABLE training_plan_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Training plan steps are viewable by everyone" ON training_plan_steps FOR SELECT USING (true);
CREATE POLICY "Anyone can insert training plan steps" ON training_plan_steps FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update training plan steps" ON training_plan_steps FOR UPDATE USING (true);

-- =============================================
-- Enable Realtime
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE drill_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE training_plan_steps;

-- =============================================
-- Seed Data: Drills
-- =============================================
-- Los ejercicios viven en dos ficheros de seed, que se ejecutan en este orden
-- despues de esta migracion (son la unica fuente del catalogo: no dupliques
-- el seed aqui):
--   1. sql/drills-seed-bu.sql      Billiard University: Exam I (F1-F8) y
--                                  Exam II en sus tres niveles (S1-S10).
--                                  Empieza con DELETE FROM drills.
--   2. sql/drills-seed-drdave.sql  Ejercicios con nombre propio de la
--                                  coleccion de Dr. Dave. Solo añade filas.
--   3. sql/drills-seed-ppc.sql     Las 18 disposiciones del BU Exam V
--                                  (Placement Pool Challenge), una por fila.
--                                  Solo añade filas.

