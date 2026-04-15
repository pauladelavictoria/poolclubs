-- =============================================
-- Migration: Training / Drills Feature
-- =============================================

-- 1. Drill catalog
CREATE TABLE drills (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  skill_type TEXT NOT NULL CHECK (skill_type IN ('potting', 'position', 'safety', 'break', 'banks')),
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

INSERT INTO drills (name, description, difficulty, skill_type, setup_instructions, scoring_method, max_score, ball_positions, shot_paths) VALUES

-- BEGINNER / POTTING (3 drills)
('Tiro recto al centro',
 'Practica el tiro recto embocando bolas alineadas con la tronera central.',
 'beginner', 'potting',
 'Coloca la bola blanca en el centro de la mesa. Coloca una bola objetivo entre la blanca y la tronera central lateral. Emboca la bola objetivo en la tronera.',
 'Emboca 10 bolas de 10 intentos',
 10,
 '[{"x":50,"y":25,"color":"white"},{"x":50,"y":12,"color":"yellow"}]',
 '[{"x1":50,"y1":25,"x2":50,"y2":12,"type":"dashed"},{"x1":50,"y1":12,"x2":50,"y2":0,"type":"solid"}]'),

('Tiro recto corto',
 'Emboca bolas a corta distancia en las troneras de esquina.',
 'beginner', 'potting',
 'Coloca la bola objetivo a un palmo de la tronera de esquina, alineada. Coloca la blanca a un brazo de distancia detras. Emboca la bola objetivo.',
 'Emboca 10 bolas de 10 intentos',
 10,
 '[{"x":20,"y":25,"color":"white"},{"x":8,"y":8,"color":"red"}]',
 '[{"x1":20,"y1":25,"x2":8,"y2":8,"type":"dashed"},{"x1":8,"y1":8,"x2":0,"y2":0,"type":"solid"}]'),

('Linea de bolas',
 'Emboca una fila de bolas colocadas en linea recta hacia la tronera.',
 'beginner', 'potting',
 'Coloca 5 bolas en linea recta desde el centro hacia una tronera de esquina, separadas unos 15cm. Emboca cada una en orden empezando por la mas cercana a la tronera.',
 'Bolas embocadas de 5',
 5,
 '[{"x":25,"y":25,"color":"white"},{"x":35,"y":25,"color":"yellow"},{"x":45,"y":25,"color":"blue"},{"x":55,"y":25,"color":"red"},{"x":65,"y":25,"color":"purple"},{"x":75,"y":25,"color":"orange"}]',
 '[{"x1":25,"y1":25,"x2":75,"y2":25,"type":"dashed"}]'),

-- BEGINNER / POSITION (2 drills)
('Control de distancia',
 'Aprende a controlar la distancia de la bola blanca despues del tiro.',
 'beginner', 'position',
 'Coloca la bola blanca en la zona de salida. Emboca una bola facil y trata de dejar la blanca en una zona marcada del centro de la mesa.',
 'Zona centro=3pts, zona media=2pts, zona exterior=1pt. De 10 tiros.',
 30,
 '[{"x":25,"y":25,"color":"white"},{"x":50,"y":12,"color":"red"}]',
 '[{"x1":25,"y1":25,"x2":50,"y2":12,"type":"dashed"}]'),

('Stop shot',
 'Practica el tiro de parada: la blanca debe quedarse quieta tras el impacto.',
 'beginner', 'position',
 'Coloca la blanca y una bola objetivo separadas 30cm, alineadas a la tronera. Tira para embocar y que la blanca se quede exactamente donde estaba la bola objetivo.',
 'Blanca a <5cm=2pts, <15cm=1pt, >15cm=0. De 10 intentos.',
 20,
 '[{"x":50,"y":30,"color":"white"},{"x":50,"y":18,"color":"yellow"}]',
 '[{"x1":50,"y1":30,"x2":50,"y2":18,"type":"dashed"},{"x1":50,"y1":18,"x2":50,"y2":0,"type":"solid"}]'),

-- BEGINNER / SAFETY (1 drill)
('Seguridad basica',
 'Practica dejar la blanca pegada a la banda larga tras un tiro suave.',
 'beginner', 'safety',
 'Coloca la blanca en el centro. Tira suave hacia la banda larga opuesta intentando que la blanca se quede pegada a la banda.',
 'Distancia a banda: <5cm=2pts, <15cm=1pt, >15cm=0. De 10 intentos.',
 20,
 '[{"x":50,"y":25,"color":"white"}]',
 '[{"x1":50,"y1":25,"x2":50,"y2":2,"type":"dashed"}]'),

-- INTERMEDIATE / POTTING (3 drills)
('Tiros en diagonal',
 'Practica tiros en angulo a las troneras de esquina desde diferentes posiciones.',
 'intermediate', 'potting',
 'Coloca la bola objetivo en el punto del pie. Tira desde 5 posiciones diferentes en angulo intentando embocar en la tronera de esquina.',
 'Emboca 10 bolas de 10 intentos',
 10,
 '[{"x":75,"y":37,"color":"white"},{"x":60,"y":25,"color":"blue"}]',
 '[{"x1":75,"y1":37,"x2":60,"y2":25,"type":"dashed"},{"x1":60,"y1":25,"x2":100,"y2":0,"type":"solid"}]'),

('Tiro cortado fino',
 'Practica cortes finos (angulo pronunciado) para embocar en las esquinas.',
 'intermediate', 'potting',
 'Coloca la bola objetivo cerca de la banda larga. Coloca la blanca en el centro. Corta la bola fino para embocarla en la tronera de esquina mas cercana.',
 'Emboca 10 bolas de 10 intentos',
 10,
 '[{"x":50,"y":25,"color":"white"},{"x":80,"y":10,"color":"purple"}]',
 '[{"x1":50,"y1":25,"x2":80,"y2":10,"type":"dashed"},{"x1":80,"y1":10,"x2":100,"y2":0,"type":"solid"}]'),

('Bolas pegadas a banda',
 'Emboca bolas que estan tocando o muy cerca de la banda.',
 'intermediate', 'potting',
 'Coloca 5 bolas tocando la banda larga a distintas distancias de la tronera. Emboca cada una en la tronera mas cercana.',
 'Bolas embocadas de 5',
 5,
 '[{"x":25,"y":25,"color":"white"},{"x":30,"y":2,"color":"yellow"},{"x":45,"y":2,"color":"blue"},{"x":60,"y":2,"color":"red"},{"x":70,"y":2,"color":"purple"},{"x":85,"y":2,"color":"orange"}]',
 '[]'),

-- INTERMEDIATE / POSITION (2 drills)
('Seguir y retroceder',
 'Controla el efecto de seguimiento y retroceso de la blanca.',
 'intermediate', 'position',
 'Coloca la blanca y una bola objetivo alineadas a 40cm. Emboca la objetivo y controla si la blanca sigue adelante (follow) o retrocede (draw) segun la zona marcada.',
 'Blanca en zona correcta=2pts, zona adyacente=1pt. De 10 tiros (5 follow + 5 draw).',
 20,
 '[{"x":50,"y":35,"color":"white"},{"x":50,"y":20,"color":"yellow"}]',
 '[{"x1":50,"y1":35,"x2":50,"y2":20,"type":"dashed"},{"x1":50,"y1":20,"x2":50,"y2":0,"type":"solid"}]'),

('Posicion con angulo',
 'Usa el angulo natural de la bola blanca para posicionarte en la siguiente bola.',
 'intermediate', 'position',
 'Coloca 3 bolas en posiciones que requieren posicionamiento con angulo. Emboca las 3 en orden dejando posicion para la siguiente.',
 'Secuencia completada=6pts, 2 bolas=4pts, 1 bola=2pts. De 5 intentos.',
 30,
 '[{"x":30,"y":35,"color":"white"},{"x":40,"y":20,"color":"yellow"},{"x":65,"y":15,"color":"blue"},{"x":85,"y":8,"color":"red"}]',
 '[{"x1":30,"y1":35,"x2":40,"y2":20,"type":"dashed"},{"x1":40,"y1":20,"x2":65,"y2":15,"type":"dashed"},{"x1":65,"y1":15,"x2":85,"y2":8,"type":"dashed"}]'),

-- INTERMEDIATE / SAFETY (2 drills)
('Seguridad detras de bola',
 'Esconde la blanca detras de una bola obstaculo para dificultar el tiro del rival.',
 'intermediate', 'safety',
 'Coloca una bola obstaculo fija en el centro. Coloca la blanca en un extremo. Tira para dejar la blanca detras del obstaculo respecto a una bola objetivo.',
 'Snooker completo=3pts, parcial=1pt, sin snooker=0. De 10 intentos.',
 30,
 '[{"x":30,"y":25,"color":"white"},{"x":50,"y":25,"color":"green","label":"obstaculo"},{"x":70,"y":12,"color":"orange"}]',
 '[{"x1":30,"y1":25,"x2":50,"y2":28,"type":"dashed"}]'),

('Juego defensivo a banda',
 'Practica tiros de seguridad dejando la blanca pegada a la banda corta.',
 'intermediate', 'safety',
 'Coloca la bola objetivo en zona central. En vez de embocar, tira suave tocando la objetivo y dejando la blanca en la banda corta opuesta.',
 'Distancia a banda corta: <5cm=2pts, <15cm=1pt, >15cm=0. De 10 intentos.',
 20,
 '[{"x":50,"y":25,"color":"white"},{"x":60,"y":20,"color":"red"}]',
 '[{"x1":50,"y1":25,"x2":60,"y2":20,"type":"dashed"},{"x1":60,"y1":20,"x2":95,"y2":25,"type":"dashed"}]'),

-- INTERMEDIATE / BREAK (1 drill)
('Salida controlada',
 'Practica la salida intentando embocar al menos una bola y mantener control.',
 'intermediate', 'break',
 'Arma las bolas en triangulo estandar de 8-ball. Practica la salida desde la zona de cabecera buscando embocar una bola y dejar la blanca en el centro.',
 'Bola embocada=2pts, blanca en centro=1pt, falta=-1pt. De 10 salidas.',
 30,
 '[{"x":25,"y":25,"color":"white"},{"x":75,"y":25,"color":"yellow"},{"x":77,"y":23,"color":"blue"},{"x":77,"y":27,"color":"red"},{"x":79,"y":21,"color":"purple"},{"x":79,"y":25,"color":"orange"},{"x":79,"y":29,"color":"green"}]',
 '[{"x1":25,"y1":25,"x2":75,"y2":25,"type":"dashed"}]'),

-- INTERMEDIATE / BANKS (1 drill)
('Banda simple',
 'Emboca bolas usando una banda para alcanzar la tronera.',
 'intermediate', 'banks',
 'Coloca la bola objetivo donde no hay tiro directo a ninguna tronera. Usa una banda para embocar la bola en la tronera de esquina.',
 'Emboca 10 bolas de 10 intentos usando una banda',
 10,
 '[{"x":50,"y":25,"color":"white"},{"x":70,"y":25,"color":"maroon"}]',
 '[{"x1":50,"y1":25,"x2":70,"y2":25,"type":"dashed"},{"x1":70,"y1":25,"x2":85,"y2":0,"type":"solid"},{"x1":85,"y1":0,"x2":100,"y2":0,"type":"solid"}]'),

-- ADVANCED / POTTING (2 drills)
('Tiro largo preciso',
 'Emboca bolas a larga distancia en troneras de esquina.',
 'advanced', 'potting',
 'Coloca la blanca en una esquina de la zona de salida. Coloca la bola objetivo cerca de la tronera de esquina opuesta diagonal. Emboca a maxima distancia.',
 'Emboca 10 bolas de 10 intentos',
 10,
 '[{"x":10,"y":40,"color":"white"},{"x":90,"y":8,"color":"yellow"}]',
 '[{"x1":10,"y1":40,"x2":90,"y2":8,"type":"dashed"},{"x1":90,"y1":8,"x2":100,"y2":0,"type":"solid"}]'),

('Combo shot',
 'Usa una bola para embocar otra mediante un tiro de combinacion.',
 'advanced', 'potting',
 'Coloca dos bolas objetivo alineadas de forma que al golpear la primera, esta empuje la segunda a la tronera. Practica desde diferentes angulos.',
 'Emboca 10 combos de 10 intentos',
 10,
 '[{"x":30,"y":30,"color":"white"},{"x":55,"y":20,"color":"blue"},{"x":70,"y":12,"color":"red"}]',
 '[{"x1":30,"y1":30,"x2":55,"y2":20,"type":"dashed"},{"x1":55,"y1":20,"x2":70,"y2":12,"type":"solid"},{"x1":70,"y1":12,"x2":100,"y2":0,"type":"solid"}]'),

-- ADVANCED / POSITION (2 drills)
('Tres bandas para posicion',
 'Usa tres bandas con la blanca para llegar a la posicion ideal.',
 'advanced', 'position',
 'Emboca una bola facil y usa efecto lateral para enviar la blanca a tres bandas hasta la zona de posicion marcada para la siguiente bola.',
 'Blanca en zona ideal=3pts, zona buena=2pts, zona aceptable=1pt. De 10 tiros.',
 30,
 '[{"x":30,"y":15,"color":"white"},{"x":20,"y":8,"color":"yellow"},{"x":70,"y":35,"color":"blue","label":"siguiente"}]',
 '[{"x1":30,"y1":15,"x2":20,"y2":8,"type":"dashed"},{"x1":20,"y1":8,"x2":0,"y2":0,"type":"solid"}]'),

('Runout de 5 bolas',
 'Completa una secuencia de 5 bolas planificando la posicion en cada tiro.',
 'advanced', 'position',
 'Coloca 5 bolas en posiciones que requieren planificacion completa. Emboca las 5 en orden dejando posicion para cada siguiente bola.',
 'Secuencia completa=10pts, 4 bolas=7pts, 3=5pts, 2=3pts, 1=1pt. De 5 intentos.',
 50,
 '[{"x":25,"y":35,"color":"white"},{"x":35,"y":15,"color":"yellow"},{"x":55,"y":30,"color":"blue"},{"x":70,"y":10,"color":"red"},{"x":80,"y":35,"color":"purple"},{"x":90,"y":8,"color":"orange"}]',
 '[{"x1":25,"y1":35,"x2":35,"y2":15,"type":"dashed"}]'),

-- ADVANCED / SAFETY (1 drill)
('Snooker avanzado',
 'Crea un snooker completo dejando la blanca detras de multiples bolas.',
 'advanced', 'safety',
 'Coloca varias bolas obstaculo en el centro. Tira para dejar la blanca completamente escondida detras de las bolas obstaculo, sin linea de tiro directa a ninguna bola objetivo.',
 'Snooker total=3pts, snooker parcial=1pt, sin snooker=0. De 10 intentos.',
 30,
 '[{"x":20,"y":25,"color":"white"},{"x":50,"y":22,"color":"green","label":"obs1"},{"x":52,"y":28,"color":"purple","label":"obs2"},{"x":80,"y":10,"color":"orange"},{"x":85,"y":40,"color":"red"}]',
 '[{"x1":20,"y1":25,"x2":48,"y2":25,"type":"dashed"}]'),

-- ADVANCED / BANKS (2 drills)
('Banda doble',
 'Emboca bolas usando dos bandas para alcanzar la tronera.',
 'advanced', 'banks',
 'Coloca la bola objetivo en una posicion donde no hay tiro directo ni de una sola banda. Usa dos bandas para embocar en la tronera de esquina.',
 'Emboca 10 bolas de 10 intentos usando doble banda',
 10,
 '[{"x":40,"y":25,"color":"white"},{"x":60,"y":25,"color":"maroon"}]',
 '[{"x1":40,"y1":25,"x2":60,"y2":25,"type":"dashed"},{"x1":60,"y1":25,"x2":75,"y2":0,"type":"solid"},{"x1":75,"y1":0,"x2":100,"y2":15,"type":"solid"},{"x1":100,"y1":15,"x2":100,"y2":0,"type":"solid"}]'),

('Kick shot',
 'Golpea primero una banda con la blanca para alcanzar la bola objetivo.',
 'advanced', 'banks',
 'Coloca la bola objetivo cerca de una tronera. Coloca un obstaculo entre la blanca y la objetivo. Tira la blanca a una banda para rodear el obstaculo y golpear la objetivo.',
 'Contacto + embocada=2pts, solo contacto=1pt, fallo=0. De 10 intentos.',
 20,
 '[{"x":25,"y":25,"color":"white"},{"x":50,"y":20,"color":"green","label":"obs"},{"x":75,"y":8,"color":"red"}]',
 '[{"x1":25,"y1":25,"x2":50,"y2":0,"type":"dashed"},{"x1":50,"y1":0,"x2":75,"y2":8,"type":"dashed"}]'),

-- ADVANCED / BREAK (1 drill)
('Salida de potencia',
 'Maximiza la dispersion y el control en la salida con potencia completa.',
 'advanced', 'break',
 'Arma las bolas en triangulo. Practica la salida con maxima potencia desde diferentes posiciones de la zona de cabecera. Objetivo: embocar bola y no perder control de la blanca.',
 'Bola embocada + control=3pts, solo embocada=2pts, solo control=1pt, falta=-2pts. De 10 salidas.',
 30,
 '[{"x":25,"y":25,"color":"white"},{"x":75,"y":25,"color":"yellow"},{"x":77,"y":23,"color":"blue"},{"x":77,"y":27,"color":"red"},{"x":79,"y":21,"color":"purple"},{"x":79,"y":25,"color":"orange"},{"x":79,"y":29,"color":"green"},{"x":81,"y":19,"color":"maroon"},{"x":81,"y":23,"color":"black"},{"x":81,"y":27,"color":"yellow"},{"x":81,"y":31,"color":"blue"}]',
 '[{"x1":25,"y1":25,"x2":75,"y2":25,"type":"dashed"}]');
