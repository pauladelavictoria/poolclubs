-- =============================================
-- Drill catalog seed: Billiard University (BU) Playing-Ability Exams
-- =============================================
--
-- Source (human-authored, free, standardised, scored):
--   Billiard University (BU) Exam I – Fundamentals (drills F1-F8)
--   Billiard University (BU) Exam II – Skills, los tres niveles:
--     Bachelors (S1-S9), Masters (S1-S10), Doctorate (S1-S9)
--     S10 (salida) es identico en los tres niveles, solo se incluye una vez.
--     S3 y S4 (patrones de 9 y 8 bolas) NO estan aqui: sus 18 disposiciones
--     son 18 ejercicios independientes en sql/drills-seed-ppc.sql.
--   https://billiarduniversity.org/testing/exams/
--   Authors: David Alciatore ("Dr. Dave"), Bob Jewett, Randy Russell, Tom Ross.
--
-- Each drill below keeps the original BU setup, procedure and scoring formula
-- (translated to Spanish, wording our own). Ball coordinates are a schematic
-- transcription of the BU diagrams onto our 100x50 table (1 diamond = 12.5
-- units on both axes; left half = head, right half = foot; side pockets at
-- x=50). Diagrams are approximate on purpose - the setup text is authoritative.
--
-- WARNING - DESTRUCTIVE: the DELETE below removes every existing drill, and
-- drill_logs / training_plan_steps have ON DELETE CASCADE, so all logged
-- scores and training-plan steps are deleted with them. Back up first if the
-- database has real data.
-- =============================================

-- Nuevos skill_type: kicks (banda previa), patterns (patrones de tirada) y
-- specials (taco elevado, salto, masse). No encajaban en los 5 originales.
ALTER TABLE drills DROP CONSTRAINT IF EXISTS drills_skill_type_check;
ALTER TABLE drills ADD CONSTRAINT drills_skill_type_check
  CHECK (skill_type IN ('potting', 'position', 'safety', 'break', 'banks', 'kicks', 'patterns', 'specials'));

DELETE FROM drills;
ALTER SEQUENCE drills_id_seq RESTART WITH 1;

INSERT INTO drills (name, description, difficulty, skill_type, setup_instructions, scoring_method, max_score, ball_positions, shot_paths) VALUES

-- =============================================
-- BU Exam I - Fundamentals (F1-F8)
-- =============================================

('F1 · Tiro cortado progresivo',
 'Corte a la esquina desde siete distancias. La dificultad sube o baja segun aciertes o falles.',
 'beginner', 'potting',
 'Bola objetivo junto a la banda derecha, a la altura del tercer diamante, con un hueco de una bola respecto a la banda; se emboca en la esquina inferior derecha. La blanca va sobre la linea del primer diamante de la banda superior, en 7 posiciones: la 1 es la mas cercana a la objetivo y la 7 la mas lejana. Empieza en la posicion 4. Se permite meter la blanca.',
 'Practica progresiva: si embocas avanzas una posicion, si fallas retrocedes una (nunca por debajo de 1 ni por encima de 7). 10 tiros en total. Puntuacion = posicion final tras el ultimo tiro + 1 punto extra por cada acierto logrado en la posicion 7. Maximo 10.',
 10,
 '[{"x":50,"y":12.5,"color":"white","label":"blanca pos. 4"},{"x":91,"y":37,"color":"yellow","label":"1"}]',
 '[{"x1":50,"y1":12.5,"x2":90,"y2":36,"type":"solid"},{"x1":91,"y1":37,"x2":99,"y2":48,"type":"dashed"}]'),

('F2 · Tiro de parada progresivo',
 'Emboca la objetivo y deja la blanca clavada en el sitio de la bola fantasma.',
 'beginner', 'position',
 'Bola objetivo a media diamante de la esquina superior derecha, junto a la banda superior; se emboca en esa esquina. La blanca sobre la misma linea, en 7 posiciones (1 = mas cerca, 7 = mas lejos), empezando en la 4. La blanca debe quedar solapando al menos en parte la posicion de la bola fantasma; puede tocar banda. Marca con pegatinas la posicion de la objetivo y de la fantasma. Puedes separar blanca y objetivo de la banda siempre que la blanca quede dentro del primer diamante. Si acabas en la posicion 1 puedes colocar la blanca entre las posiciones 1 y 2 para evitar el doble golpe.',
 'Practica progresiva: acierto = avanzas una posicion, fallo = retrocedes una (1 a 7). 10 tiros. Puntuacion = posicion final + 1 punto extra por acierto en la posicion 7. Maximo 10.',
 10,
 '[{"x":50,"y":6.25,"color":"white","label":"blanca pos. 4"},{"x":93.75,"y":6.25,"color":"yellow","label":"1"}]',
 '[{"x1":50,"y1":6.25,"x2":92,"y2":6.25,"type":"solid"},{"x1":93.75,"y1":6.25,"x2":99,"y2":1.5,"type":"dashed"}]'),

('F3 · Tiro de seguimiento progresivo',
 'Emboca la objetivo y lleva la blanca con efecto de seguimiento hasta la diana de la esquina.',
 'beginner', 'position',
 'Bola objetivo junto a la banda superior; se emboca en la esquina superior derecha. La blanca siempre a un diamante por detras de la objetivo, en 7 posiciones (1 = mas cerca de la esquina, 7 = mas lejos), empezando en la 4. La diana es una hoja A4 con el centro recortado (marco de 2,5 cm) colocada en la esquina de llegada; imprime la plantilla de la web de BU o recorta cualquier folio. Vale si embocas la objetivo y la blanca queda dentro de la diana o solapandola. Blanca y objetivo pueden tocar banda.',
 'Practica progresiva: acierto = avanzas una posicion, fallo = retrocedes una (1 a 7). 10 tiros. Puntuacion = posicion final + 1 punto extra por acierto en la posicion 7. Maximo 10.',
 10,
 '[{"x":50,"y":6.25,"color":"white","label":"blanca pos. 3"},{"x":62.5,"y":6.25,"color":"yellow","label":"1"}]',
 '[{"x1":50,"y1":6.25,"x2":88,"y2":7,"type":"solid"},{"x1":62.5,"y1":6.25,"x2":99,"y2":1.5,"type":"dashed"}]'),

('F4 · Tiro de retroceso progresivo',
 'Emboca la objetivo y trae la blanca de vuelta al rectangulo junto a la tronera central.',
 'intermediate', 'position',
 'Bola objetivo a media diamante de la esquina superior derecha, junto a la banda superior; se emboca en esa esquina. La blanca sobre la misma linea, en 7 posiciones (1 = mas cerca, 7 = mas lejos), empezando en la 4. La diana es un rectangulo fijo de 2 x 1 diamantes pegado a la tronera central superior (de x=2 a x=4 diamantes desde la esquina de cabecera); marca las esquinas con pegatinas. El centro de la blanca debe acabar dentro del rectangulo. La blanca puede tocar la banda superior. El rectangulo no se mueve con la blanca. Si acabas en la posicion 1 puedes colocar la blanca entre las posiciones 1 y 2 para evitar el doble golpe.',
 'Practica progresiva: acierto = avanzas una posicion, fallo = retrocedes una (1 a 7). 10 tiros. Puntuacion = posicion final + 1 punto extra por acierto en la posicion 7. Maximo 10.',
 10,
 '[{"x":50,"y":6.25,"color":"white","label":"blanca pos. 4"},{"x":93.75,"y":6.25,"color":"yellow","label":"1"}]',
 '[{"x1":93.75,"y1":6.25,"x2":62,"y2":7,"type":"solid"},{"x1":93.75,"y1":6.25,"x2":99,"y2":1.5,"type":"dashed"}]'),

('F5 · Tiro de deslizamiento progresivo',
 'Emboca en la tronera central y deja la blanca en una diana cada vez mas lejana, de ida o de vuelta de banda.',
 'intermediate', 'position',
 'Bola objetivo una bola por debajo del centro de la mesa; se emboca en la tronera central inferior. Blanca a mano en cada tiro. La diana (hoja A4 con el centro recortado) se coloca en 7 posiciones sobre la linea central: las 1, 2 y 3 se alcanzan directamente, la 4 pegada a la banda corta con el lado largo contra la banda, y las 5, 6 y 7 obligan a que la blanca vuelva rebotando de la banda corta. Empieza en la posicion 4. Vale si embocas la objetivo y la blanca queda dentro de la diana o solapandola.',
 'Practica progresiva con la diana: acierto = la diana avanza una posicion, fallo = retrocede una (1 a 7). 10 tiros. Puntuacion = posicion final de la diana + 1 punto extra por acierto en la posicion 7. Maximo 10.',
 10,
 '[{"x":38,"y":20,"color":"white","label":"blanca a mano"},{"x":50,"y":27.5,"color":"yellow","label":"1"}]',
 '[{"x1":38,"y1":20,"x2":49,"y2":26.5,"type":"solid"},{"x1":50,"y1":27.5,"x2":95,"y2":25,"type":"solid"},{"x1":50,"y1":27.5,"x2":50,"y2":48,"type":"dashed"}]'),

('F6 · Serie de embocada',
 'Diez tiros fijos, cinco desde cada posicion de blanca, a distintas troneras y angulos.',
 'beginner', 'potting',
 'Coloca las bolas objetivo segun el diagrama: dos cerca de la linea de cabecera (arriba y abajo), una en el centro de la mesa y una en el punto del pie. Coloca la blanca en las dos posiciones marcadas del lado de cabecera. Desde cada posicion de blanca tiras 5 tiros a las troneras indicadas. Un intento por tiro, en orden, y no vale meter la blanca.',
 'Un punto por cada bola embocada. 10 tiros, un intento cada uno. No es progresivo: tiras los 10 pase lo que pase. Maximo 10.',
 10,
 '[{"x":25,"y":15,"color":"white","label":"blanca A"},{"x":25,"y":36,"color":"white","label":"blanca B"},{"x":37.5,"y":15,"color":"yellow"},{"x":37.5,"y":36,"color":"blue"},{"x":50,"y":25,"color":"red"},{"x":75,"y":25,"color":"purple"}]',
 '[]'),

('F7 · Rueda de carro',
 'Emboca siempre la misma bola en la tronera central y manda la blanca a golpear cada una de las diez bolas repartidas por bandas y troneras.',
 'intermediate', 'position',
 'Bola objetivo sobre la linea central longitudinal, a un diamante de la banda superior, alineada con la tronera central superior. Coloca 10 bolas repartidas por el resto de bandas y bocas de tronera (banda superior, esquina, banda corta derecha, esquina inferior y banda inferior). Blanca a mano en cada tiro. Hay que embocar la objetivo y que la blanca golpee la bola diana de turno. Se permite ir de banda justo al lado de la diana, pero no tocar ninguna otra banda de camino. Retira las dianas ya completadas y recoloca las que se muevan.',
 '2 intentos por cada una de las 10 dianas, 1 punto por intento con exito (objetivo embocada + diana golpeada). Maximo 20.',
 20,
 '[{"x":50,"y":12.5,"color":"yellow","label":"objetivo"},{"x":44,"y":22,"color":"white","label":"blanca a mano"},{"x":62.5,"y":2,"color":"blue","label":"1"},{"x":75,"y":2,"color":"red","label":"2"},{"x":87.5,"y":2,"color":"purple","label":"3"},{"x":96,"y":2,"color":"orange","label":"4"},{"x":98,"y":12.5,"color":"green","label":"5"},{"x":98,"y":25,"color":"maroon","label":"6"},{"x":98,"y":37.5,"color":"black","label":"7"},{"x":96,"y":48,"color":"yellow","label":"8"},{"x":87.5,"y":48,"color":"blue","label":"9"},{"x":75,"y":48,"color":"red","label":"10"}]',
 '[{"x1":50,"y1":12.5,"x2":50,"y2":2,"type":"dashed"}]'),

('F8 · Dianas en cuadricula',
 'Emboca siempre la misma bola y deja la blanca en cinco dianas repartidas por la mesa.',
 'intermediate', 'position',
 'Bola objetivo cerca de la esquina superior izquierda (se emboca en esa esquina) y blanca en la posicion marcada del centro de la zona de cabecera, ambas fijas todo el ejercicio. Coloca las 5 dianas (hoja A4 con el centro recortado) en las posiciones del diagrama: dos en el cuarto superior, dos en el inferior y una en el centro de la mesa. Hay que embocar la objetivo y dejar la blanca dentro de la diana o solapandola. Puedes llegar a la diana como quieras: directo o con las bandas que necesites.',
 '4 intentos por cada una de las 5 dianas, 1 punto por acierto. Maximo 20.',
 20,
 '[{"x":16,"y":15,"color":"yellow","label":"1"},{"x":22,"y":26,"color":"white","label":"blanca"}]',
 '[{"x1":16,"y1":15,"x2":1.5,"y2":1.5,"type":"dashed"}]'),

-- =============================================
-- BU Exam II - Skills, nivel Masters (S1-S10)
-- =============================================

('S1 · Fila de bolas (Masters)',
 'Siete bolas en fila sobre la linea central: embocalas en orden sin tocar las demas.',
 'intermediate', 'position',
 'Coloca 7 bolas en fila sobre la linea central longitudinal, en la mitad del pie: entre la 1 y la 2 deja un hueco de una bola y entre las demas un hueco de dos bolas. Blanca a mano para empezar. Emboca en orden numerico en cualquier tronera, sin meter la blanca y sin tocar ninguna de las bolas que quedan. Si mueves una bola al embocar otra, esa cuenta pero la tirada termina.',
 'Puntuacion = bolas embocadas legalmente antes de fallar, meter la blanca o tocar otra bola. Haz el ejercicio dos veces y quedate con la mejor. Maximo 7.',
 7,
 '[{"x":91,"y":25,"color":"yellow","label":"1"},{"x":85,"y":25,"color":"blue","label":"2"},{"x":78,"y":25,"color":"red","label":"3"},{"x":72,"y":25,"color":"purple","label":"4"},{"x":65,"y":25,"color":"orange","label":"5"},{"x":59,"y":25,"color":"green","label":"6"},{"x":52,"y":25,"color":"maroon","label":"7"}]',
 '[]'),

('S2 · Cortes pegados a banda (Masters)',
 'Once bolas pegadas a las bandas y una en el centro: embocalas todas sin tocar las demas.',
 'advanced', 'potting',
 'Coloca 10 bolas pegadas a las bandas en las posiciones del diagrama (dos en cada banda larga por lado, tres en la banda corta derecha, tres en la izquierda) y una bola en el centro de la mesa. Blanca a mano para empezar. Emboca en el orden que quieras. No vale meter la blanca, jugar combinaciones ni mover ninguna de las bolas que quedan.',
 'Puntuacion = bolas embocadas legalmente antes de fallar, meter la blanca o tocar otra bola. Haz el ejercicio dos veces y quedate con la mejor. Maximo 11.',
 11,
 '[{"x":27,"y":2,"color":"yellow","label":"1"},{"x":72,"y":2,"color":"blue","label":"2"},{"x":98,"y":15,"color":"red","label":"3"},{"x":98,"y":25,"color":"purple","label":"4"},{"x":98,"y":37,"color":"orange","label":"5"},{"x":72,"y":48,"color":"green","label":"6"},{"x":27,"y":48,"color":"maroon","label":"7"},{"x":2,"y":37,"color":"black","label":"8"},{"x":2,"y":25,"color":"yellow","label":"9"},{"x":2,"y":15,"color":"blue","label":"10"},{"x":50,"y":25,"color":"red","label":"11"}]',
 '[]'),

('S5 · Defensa esconde la blanca (Masters)',
 'Usa un grupo de bolas apinadas como pantalla para dejar la blanca sin linea a la bola objetivo.',
 'advanced', 'safety',
 'Coloca la bola 1 en la posicion marcada de la zona de cabecera y un grupo de bolas bien apinadas dentro de una diana (hoja A4 con el centro recortado) situada en el cuarto superior derecho. Tira desde las 5 posiciones de blanca del diagrama. Cada tiro debe ser legal y dejar la blanca escondida detras del grupo, sin ninguna linea directa de contacto con la 1. La 1 no puede entrar en tronera. Puedes tocar las bolas del grupo, pero todas deben quedar dentro de la diana o solapandola.',
 '2 intentos desde cada una de las 5 posiciones, 1 punto por cada bloqueo conseguido. Maximo 10.',
 10,
 '[{"x":25,"y":25,"color":"white","label":"1"},{"x":12.5,"y":25,"color":"white","label":"2"},{"x":12.5,"y":37.5,"color":"white","label":"3"},{"x":12.5,"y":44,"color":"white","label":"4"},{"x":25,"y":44,"color":"white","label":"5"},{"x":25,"y":37.5,"color":"yellow","label":"bola 1"},{"x":73,"y":13.5,"color":"blue"},{"x":76,"y":13.5,"color":"red"},{"x":74.5,"y":16,"color":"green"},{"x":77.5,"y":16,"color":"orange"},{"x":76,"y":18.5,"color":"purple"}]',
 '[]'),

('S6 · Kicks de una y dos bandas (Masters)',
 'Golpea la bola objetivo saliendo primero de banda, desde la misma posicion de blanca.',
 'intermediate', 'kicks',
 'Coloca 4 bolas objetivo sobre la linea central longitudinal, en las posiciones del diagrama, y la blanca fija en el cuarto superior izquierdo. Tiros 1 a 4: kick a cada objetivo saliendo de la misma banda larga, siempre desde esa misma posicion de blanca. Tiro 5: blanca a mano, kick de dos bandas a la bola 1.',
 '1 punto por cada kick con exito y legal (sin meter la blanca y con bola a banda despues del contacto). 5 tiros. Maximo 5.',
 5,
 '[{"x":12.5,"y":12.5,"color":"white","label":"blanca"},{"x":27,"y":25,"color":"yellow","label":"1"},{"x":38,"y":25,"color":"blue","label":"2"},{"x":50,"y":25,"color":"red","label":"3"},{"x":72,"y":25,"color":"purple","label":"4"}]',
 '[{"x1":12.5,"y1":12.5,"x2":30,"y2":48,"type":"solid"},{"x1":30,"y1":48,"x2":27,"y2":27,"type":"solid"}]'),

('S7 · Banda cruzada a la central (Masters)',
 'Manda la objetivo de banda a la tronera central contraria desde cinco angulos.',
 'intermediate', 'banks',
 'Coloca la bola objetivo en la posicion marcada, entre la linea central y la banda inferior. Coloca la blanca en las 5 posiciones en fila del diagrama, sobre la linea central. Desde cada una, juega la objetivo de banda a la tronera central del lado contrario.',
 '1 punto por cada banda embocada legalmente (sin meter la blanca). 5 tiros. Maximo 5.',
 5,
 '[{"x":34,"y":25,"color":"white","label":"1"},{"x":37,"y":25,"color":"white","label":"2"},{"x":40,"y":25,"color":"white","label":"3"},{"x":43,"y":25,"color":"white","label":"4"},{"x":46,"y":25,"color":"white","label":"5"},{"x":38,"y":37,"color":"yellow","label":"objetivo"}]',
 '[{"x1":38,"y1":37,"x2":44,"y2":48,"type":"dashed"},{"x1":44,"y1":48,"x2":50,"y2":2,"type":"dashed"}]'),

('S8 · Taco elevado (Masters)',
 'Emboca con la blanca pegada a la banda o pegada a una bola obstaculo, levantando la culata.',
 'advanced', 'specials',
 'Coloca 5 bolas objetivo a mitad de camino entre su posicion de blanca y la esquina inferior derecha, segun el diagrama. Cuatro tiros se juegan con la blanca pegada a la banda superior y uno con la blanca pegada a una bola obstaculo en la linea del tiro. Emboca cada objetivo desde la posicion de blanca indicada, sin meter la blanca.',
 '1 punto por cada bola embocada. 5 tiros. Maximo 5.',
 5,
 '[{"x":38,"y":2,"color":"white","label":"A"},{"x":60,"y":2,"color":"white","label":"B"},{"x":72,"y":2,"color":"white","label":"C"},{"x":83,"y":2,"color":"white","label":"D"},{"x":38,"y":17,"color":"white","label":"E"},{"x":35,"y":17,"color":"black","label":"obstaculo"},{"x":65,"y":31,"color":"orange","label":"5"},{"x":65,"y":26,"color":"purple","label":"4"},{"x":78,"y":28,"color":"red","label":"3"},{"x":82,"y":26,"color":"blue","label":"2"},{"x":88,"y":26,"color":"yellow","label":"1"}]',
 '[{"x1":88,"y1":26,"x2":98,"y2":47,"type":"dashed"}]'),

('S9 · Salto o masse (Masters)',
 'Pasa por encima o rodea la bola obstaculo y emboca la bola colgada de la esquina.',
 'advanced', 'specials',
 'Coloca la bola objetivo colgada en la boca de la esquina inferior derecha, la blanca en el cuarto superior izquierdo y una bola obstaculo justo en la linea entre ambas, cerca de la blanca. Salta por encima del obstaculo o curva la blanca a su alrededor y emboca la objetivo sin tocar el obstaculo. Practica las dos tecnicas y usa en la prueba la que domines mas.',
 '1 punto por cada tiro con exito (bola embocada y sin contacto con el obstaculo) de 5 intentos. Se permite meter la blanca. Maximo 5.',
 5,
 '[{"x":16,"y":17,"color":"white","label":"blanca"},{"x":27,"y":21,"color":"black","label":"obstaculo"},{"x":96,"y":47,"color":"yellow","label":"objetivo"}]',
 '[{"x1":16,"y1":17,"x2":94,"y2":45,"type":"solid"},{"x1":96,"y1":47,"x2":99,"y2":48.5,"type":"dashed"}]'),

('S10 · Salida de 9 bolas controlada',
 'Rompe tres veces puntuando control de blanca, dispersion y bolas embocadas.',
 'advanced', 'break',
 'Arma el rombo de 9 bolas en el punto del pie. Blanca a mano detras de la linea de cabecera. La zona diana de la blanca son los 4 diamantes centrales de la mesa (no por encima de la linea de cabecera). Rompe tres veces y puntua cada salida por separado.',
 'Por cada salida, 1 punto por cada condicion cumplida: a) no meter la blanca; b) sin meter la blanca, que la blanca no llegue a banda; c) sin meter la blanca, que el centro de la blanca no salga de la zona central de 4 diamantes durante toda la salida; d) sin meter la blanca, al menos 1 bola embocada; e) sin meter la blanca, 3 o mas bolas embocadas o pasadas por encima de la linea de cabecera. Descarta la mejor y la peor de las tres salidas: la puntuacion es la del medio (mediana). Maximo 5.',
 5,
 '[{"x":12.5,"y":25,"color":"white","label":"blanca a mano"},{"x":75,"y":25,"color":"yellow","label":"1"},{"x":78,"y":23,"color":"blue"},{"x":78,"y":27,"color":"red"},{"x":81,"y":21,"color":"purple"},{"x":81,"y":25,"color":"yellow","label":"9"},{"x":81,"y":29,"color":"green"},{"x":84,"y":23,"color":"maroon"},{"x":84,"y":27,"color":"orange"},{"x":87,"y":25,"color":"black"}]',
 '[{"x1":12.5,"y1":25,"x2":73,"y2":25,"type":"solid"}]'),

-- =============================================
-- BU Exam II - Skills, nivel Bachelors (S1-S9)
-- Mismos 9 ejercicios que el nivel Masters con disposiciones mas faciles y
-- menos intentos. S10 (salida) es identico en los tres niveles: no se repite.
-- =============================================

('S1 · Fila de bolas (Bachelors)',
 'Cuatro bolas en fila sobre la linea central: embocalas en orden sin tocar las demas.',
 'intermediate', 'position',
 'Coloca 4 bolas en fila sobre la linea central longitudinal, en la mitad del pie: entre la 1 y la 2 deja un hueco de una bola y entre las demas un hueco de tres bolas. Blanca a mano para empezar. Emboca en orden numerico en cualquier tronera, sin meter la blanca y sin tocar ninguna de las bolas que quedan. Si mueves una bola al embocar otra, esa cuenta pero la tirada termina.',
 'Puntuacion = bolas embocadas legalmente antes de fallar, meter la blanca o tocar otra bola. Haz el ejercicio dos veces y quedate con la mejor. Maximo 4.',
 4,
 '[{"x":91,"y":25,"color":"yellow","label":"1"},{"x":83,"y":25,"color":"blue","label":"2"},{"x":74,"y":25,"color":"red","label":"3"},{"x":65,"y":25,"color":"purple","label":"4"}]',
 '[]'),

('S2 · Cortes pegados a banda (Bachelors)',
 'Seis bolas pegadas a las bandas y una en el centro: embocalas todas sin tocar las demas.',
 'intermediate', 'potting',
 'Coloca 6 bolas pegadas a las bandas en las posiciones del diagrama (dos en la banda superior, dos en la inferior y una en el centro de cada banda corta) y una bola en el centro de la mesa. Blanca a mano para empezar. Emboca en el orden que quieras. No vale meter la blanca, jugar combinaciones ni mover ninguna de las bolas que quedan.',
 'Puntuacion = bolas embocadas legalmente antes de fallar, meter la blanca o tocar otra bola. Haz el ejercicio dos veces y quedate con la mejor. Maximo 7.',
 7,
 '[{"x":27,"y":2,"color":"yellow","label":"1"},{"x":72,"y":2,"color":"blue","label":"2"},{"x":98,"y":25,"color":"red","label":"3"},{"x":72,"y":48,"color":"purple","label":"4"},{"x":27,"y":48,"color":"orange","label":"5"},{"x":2,"y":25,"color":"green","label":"6"},{"x":50,"y":25,"color":"maroon","label":"7"}]',
 '[]'),

('S5 · Defensa esconde la blanca (Bachelors)',
 'Usa un grupo de bolas apinadas como pantalla para dejar la blanca sin linea a la bola objetivo.',
 'intermediate', 'safety',
 'Coloca la bola 1 en la posicion marcada de la zona de cabecera y un grupo de bolas bien apinadas dentro de una diana (hoja A4 con el centro recortado) situada en el cuarto superior derecho. Tira desde las 3 posiciones de blanca del diagrama. Cada tiro debe ser legal y dejar la blanca escondida detras del grupo, sin ninguna linea directa de contacto con la 1. La 1 no puede entrar en tronera. Puedes tocar las bolas del grupo, pero todas deben quedar dentro de la diana o solapandola.',
 '2 intentos desde cada una de las 3 posiciones, 1 punto por cada bloqueo conseguido. Maximo 6.',
 6,
 '[{"x":12.5,"y":25,"color":"white","label":"1"},{"x":12.5,"y":43,"color":"white","label":"2"},{"x":25,"y":43,"color":"white","label":"3"},{"x":25,"y":37.5,"color":"yellow","label":"bola 1"},{"x":73,"y":13.5,"color":"blue"},{"x":76,"y":13.5,"color":"red"},{"x":74.5,"y":16,"color":"green"},{"x":77.5,"y":16,"color":"orange"},{"x":76,"y":18.5,"color":"purple"}]',
 '[]'),

('S6 · Kicks de una banda (Bachelors)',
 'Golpea tres bolas objetivo saliendo primero de banda, desde la misma posicion de blanca.',
 'intermediate', 'kicks',
 'Coloca 3 bolas objetivo sobre la linea central longitudinal, en las posiciones del diagrama, y la blanca fija en el cuarto superior izquierdo. Kick a cada objetivo saliendo de la misma banda larga, siempre desde esa misma posicion de blanca.',
 '1 punto por cada kick con exito y legal (sin meter la blanca y con bola a banda despues del contacto). 3 tiros. Maximo 3.',
 3,
 '[{"x":12.5,"y":12.5,"color":"white","label":"blanca"},{"x":27,"y":25,"color":"yellow","label":"1"},{"x":38,"y":25,"color":"blue","label":"2"},{"x":50,"y":25,"color":"red","label":"3"}]',
 '[{"x1":12.5,"y1":12.5,"x2":30,"y2":48,"type":"solid"},{"x1":30,"y1":48,"x2":27,"y2":27,"type":"solid"}]'),

('S7 · Banda cruzada a la central (Bachelors)',
 'Manda tres bolas de banda a la tronera central contraria, con blanca a mano en cada tiro.',
 'intermediate', 'banks',
 'Coloca 3 bolas objetivo en fila con huecos de una bola, entre la linea central y la banda inferior, segun el diagrama. Blanca a mano en cada tiro. Juega cada bola de banda a la tronera central del lado contrario.',
 '1 punto por cada banda embocada legalmente (sin meter la blanca). 3 tiros. Maximo 3.',
 3,
 '[{"x":36,"y":17,"color":"white","label":"blanca a mano"},{"x":30,"y":26,"color":"red","label":"3"},{"x":34,"y":26,"color":"blue","label":"2"},{"x":38,"y":26,"color":"yellow","label":"1"}]',
 '[{"x1":38,"y1":26,"x2":44,"y2":48,"type":"dashed"},{"x1":44,"y1":48,"x2":50,"y2":2,"type":"dashed"}]'),

('S8 · Taco elevado (Bachelors)',
 'Emboca con la blanca pegada a la banda o pegada a una bola obstaculo, levantando la culata.',
 'intermediate', 'specials',
 'Coloca 3 bolas objetivo a mitad de camino entre su posicion de blanca y la esquina inferior derecha, segun el diagrama. Dos tiros se juegan con la blanca pegada a la banda superior y uno con la blanca pegada a una bola obstaculo en la linea del tiro. Emboca cada objetivo desde la posicion de blanca indicada, sin meter la blanca.',
 '1 punto por cada bola embocada. 3 tiros. Maximo 3.',
 3,
 '[{"x":63,"y":3,"color":"white","label":"A"},{"x":60,"y":2,"color":"black","label":"obstaculo"},{"x":72,"y":2,"color":"white","label":"B"},{"x":83,"y":2,"color":"white","label":"C"},{"x":78,"y":28,"color":"red","label":"3"},{"x":82,"y":26,"color":"blue","label":"2"},{"x":88,"y":26,"color":"yellow","label":"1"}]',
 '[{"x1":88,"y1":26,"x2":98,"y2":47,"type":"dashed"}]'),

('S9 · Salto o masse (Bachelors)',
 'Salta el hueco entre dos bolas obstaculo, o rodea una de ellas, y emboca la bola colgada.',
 'intermediate', 'specials',
 'Coloca la bola objetivo colgada en la boca de la esquina inferior derecha y la blanca en el cuarto superior izquierdo. Pon dos bolas obstaculo en la linea del tiro, separadas por el hueco de una bola. Salta por encima del hueco y emboca la objetivo sin tocar los obstaculos. Si prefieres curvar la blanca en vez de saltar, retira una de las dos bolas obstaculo.',
 '1 punto por cada tiro con exito (bola embocada y sin contacto con los obstaculos) de 3 intentos. Se permite meter la blanca. Maximo 3.',
 3,
 '[{"x":16,"y":17,"color":"white","label":"blanca"},{"x":28,"y":18,"color":"black","label":"obs. 1"},{"x":27,"y":21.5,"color":"black","label":"obs. 2"},{"x":96,"y":47,"color":"yellow","label":"objetivo"}]',
 '[{"x1":16,"y1":17,"x2":94,"y2":45,"type":"solid"},{"x1":96,"y1":47,"x2":99,"y2":48.5,"type":"dashed"}]'),

-- =============================================
-- BU Exam II - Skills, nivel Doctorate (S1-S9)
-- Mismos 9 ejercicios con las disposiciones mas duras y mas intentos.
-- =============================================

('S1 · Fila de bolas (Doctorate)',
 'Diez bolas en fila con huecos de una bola: embocalas en orden sin tocar las demas.',
 'advanced', 'position',
 'Coloca 10 bolas en fila sobre la linea central longitudinal, en la mitad del pie, todas con huecos de una bola entre ellas. Blanca a mano para empezar. Emboca en orden numerico en cualquier tronera, sin meter la blanca y sin tocar ninguna de las bolas que quedan. Si mueves una bola al embocar otra, esa cuenta pero la tirada termina.',
 'Puntuacion = bolas embocadas legalmente antes de fallar, meter la blanca o tocar otra bola. Haz el ejercicio dos veces y quedate con la mejor. Maximo 10.',
 10,
 '[{"x":91,"y":25,"color":"yellow","label":"1"},{"x":86,"y":25,"color":"blue","label":"2"},{"x":82,"y":25,"color":"red","label":"3"},{"x":77,"y":25,"color":"purple","label":"4"},{"x":73,"y":25,"color":"orange","label":"5"},{"x":68,"y":25,"color":"green","label":"6"},{"x":64,"y":25,"color":"maroon","label":"7"},{"x":59,"y":25,"color":"black","label":"8"},{"x":55,"y":25,"color":"yellow","label":"9"},{"x":50,"y":25,"color":"blue","label":"10"}]',
 '[]'),

('S2 · Cortes pegados a banda (Doctorate)',
 'Catorce bolas pegadas a las bandas y una en el centro: embocalas todas sin tocar las demas.',
 'advanced', 'potting',
 'Coloca 14 bolas pegadas a las bandas en las posiciones del diagrama (cuatro en cada banda larga, tres en cada banda corta) y una bola en el centro de la mesa. Blanca a mano para empezar. Emboca en el orden que quieras. No vale meter la blanca, jugar combinaciones ni mover ninguna de las bolas que quedan.',
 'Puntuacion = bolas embocadas legalmente antes de fallar, meter la blanca o tocar otra bola. Haz el ejercicio dos veces y quedate con la mejor. Maximo 15.',
 15,
 '[{"x":16,"y":2,"color":"yellow","label":"1"},{"x":27,"y":2,"color":"blue","label":"2"},{"x":72,"y":2,"color":"red","label":"3"},{"x":83,"y":2,"color":"purple","label":"4"},{"x":98,"y":15,"color":"orange","label":"5"},{"x":98,"y":25,"color":"green","label":"6"},{"x":98,"y":37,"color":"maroon","label":"7"},{"x":83,"y":48,"color":"black","label":"8"},{"x":72,"y":48,"color":"yellow","label":"9"},{"x":27,"y":48,"color":"blue","label":"10"},{"x":16,"y":48,"color":"red","label":"11"},{"x":2,"y":37,"color":"purple","label":"12"},{"x":2,"y":25,"color":"orange","label":"13"},{"x":2,"y":15,"color":"green","label":"14"},{"x":50,"y":25,"color":"maroon","label":"15"}]',
 '[]'),

('S5 · Defensa esconde la blanca (Doctorate)',
 'Siete posiciones de blanca: esconde la blanca detras del grupo desde todas ellas.',
 'advanced', 'safety',
 'Coloca la bola 1 en la posicion marcada de la zona de cabecera y un grupo de bolas bien apinadas dentro de una diana (hoja A4 con el centro recortado) situada en el cuarto superior derecho. Tira desde las 7 posiciones de blanca del diagrama. Cada tiro debe ser legal y dejar la blanca escondida detras del grupo, sin ninguna linea directa de contacto con la 1. La 1 no puede entrar en tronera. Puedes tocar las bolas del grupo, pero todas deben quedar dentro de la diana o solapandola.',
 '2 intentos desde cada una de las 7 posiciones, 1 punto por cada bloqueo conseguido. Maximo 14.',
 14,
 '[{"x":25,"y":25,"color":"white","label":"1"},{"x":12.5,"y":25,"color":"white","label":"2"},{"x":12.5,"y":31,"color":"white","label":"3"},{"x":12.5,"y":37.5,"color":"white","label":"4"},{"x":12.5,"y":43,"color":"white","label":"5"},{"x":25,"y":43,"color":"white","label":"6"},{"x":33,"y":43,"color":"white","label":"7"},{"x":25,"y":37.5,"color":"yellow","label":"bola 1"},{"x":73,"y":13.5,"color":"blue"},{"x":76,"y":13.5,"color":"red"},{"x":74.5,"y":16,"color":"green"},{"x":77.5,"y":16,"color":"orange"},{"x":76,"y":18.5,"color":"purple"}]',
 '[]'),

('S6 · Kicks de una, dos y tres bandas (Doctorate)',
 'Cuatro kicks de una banda mas dos de dos bandas y uno de tres.',
 'advanced', 'kicks',
 'Coloca 4 bolas objetivo sobre la linea central longitudinal, en las posiciones del diagrama, y la blanca fija en el cuarto superior izquierdo. Tiros 1 a 4: kick a cada objetivo saliendo de la misma banda larga, siempre desde esa misma posicion de blanca. Tiros 5 y 6: blanca a mano, kick de dos bandas a la bola 1 y a la bola 3. Tiro 7: blanca a mano, kick de tres bandas a la bola 2.',
 '1 punto por cada kick con exito y legal (sin meter la blanca y con bola a banda despues del contacto). 7 tiros. Maximo 7.',
 7,
 '[{"x":12.5,"y":12.5,"color":"white","label":"blanca"},{"x":27,"y":25,"color":"yellow","label":"1"},{"x":38,"y":25,"color":"blue","label":"2"},{"x":50,"y":25,"color":"red","label":"3"},{"x":72,"y":25,"color":"purple","label":"4"}]',
 '[{"x1":12.5,"y1":12.5,"x2":30,"y2":48,"type":"solid"},{"x1":30,"y1":48,"x2":27,"y2":27,"type":"solid"}]'),

('S7 · Banda cruzada a la esquina (Doctorate)',
 'Manda la objetivo de banda a la esquina contraria desde siete angulos.',
 'advanced', 'banks',
 'Coloca la bola objetivo en la posicion marcada, entre la linea central y la banda inferior. Coloca la blanca en las 7 posiciones en fila del diagrama, sobre la linea central. Desde cada una, juega la objetivo de banda a la esquina del lado contrario (banda cruzada a esquina, no a la central).',
 '1 punto por cada banda embocada legalmente (sin meter la blanca). 7 tiros. Maximo 7.',
 7,
 '[{"x":72,"y":25,"color":"white","label":"1"},{"x":66,"y":25,"color":"white","label":"2"},{"x":61,"y":25,"color":"white","label":"3"},{"x":55,"y":25,"color":"white","label":"4"},{"x":50,"y":25,"color":"white","label":"5"},{"x":44,"y":25,"color":"white","label":"6"},{"x":38,"y":25,"color":"white","label":"7"},{"x":72,"y":37,"color":"yellow","label":"objetivo"}]',
 '[{"x1":72,"y1":37,"x2":77,"y2":48,"type":"dashed"},{"x1":77,"y1":48,"x2":99,"y2":2,"type":"dashed"}]'),

('S8 · Taco elevado (Doctorate)',
 'Siete tiros con la blanca pegada a banda o pegada a una bola obstaculo.',
 'advanced', 'specials',
 'Coloca 7 bolas objetivo a mitad de camino entre su posicion de blanca y la esquina inferior derecha, segun el diagrama. Cinco tiros se juegan con la blanca pegada a la banda superior o a la izquierda y dos con la blanca pegada a una bola obstaculo en la linea del tiro. Emboca cada objetivo desde la posicion de blanca indicada, sin meter la blanca.',
 '1 punto por cada bola embocada. 7 tiros. Maximo 7.',
 7,
 '[{"x":38,"y":2,"color":"white","label":"A"},{"x":60,"y":2,"color":"white","label":"B"},{"x":72,"y":2,"color":"white","label":"C"},{"x":83,"y":2,"color":"white","label":"D"},{"x":38,"y":17,"color":"white","label":"E"},{"x":35,"y":17,"color":"black","label":"obs."},{"x":2,"y":26,"color":"white","label":"F"},{"x":29,"y":37,"color":"white","label":"G"},{"x":26,"y":37,"color":"black","label":"obs."},{"x":65,"y":31,"color":"orange","label":"5"},{"x":65,"y":26,"color":"purple","label":"4"},{"x":78,"y":28,"color":"red","label":"3"},{"x":82,"y":26,"color":"blue","label":"2"},{"x":88,"y":26,"color":"yellow","label":"1"},{"x":48,"y":36,"color":"green","label":"6"},{"x":61,"y":41,"color":"maroon","label":"7"}]',
 '[{"x1":88,"y1":26,"x2":98,"y2":47,"type":"dashed"},{"x1":61,"y1":41,"x2":98,"y2":47,"type":"dashed"}]'),

('S9 · Salto o masse a tronera (Doctorate)',
 'Salta o curva la blanca sobre la bola obstaculo y metela en la esquina contraria.',
 'advanced', 'specials',
 'Coloca la blanca en el cuarto superior izquierdo y una bola obstaculo justo en la linea hacia la esquina inferior derecha, con un hueco de dos bolas respecto a la blanca. No hay bola objetivo: el objetivo es la propia blanca. Salta por encima del obstaculo o curva la blanca a su alrededor y metela en la esquina inferior derecha sin tocar el obstaculo.',
 '1 punto por cada tiro con exito (blanca embocada en la esquina y sin contacto con el obstaculo) de 7 intentos. Maximo 7.',
 7,
 '[{"x":16,"y":17,"color":"white","label":"blanca"},{"x":22.5,"y":18,"color":"black","label":"obstaculo"}]',
 '[{"x1":16,"y1":17,"x2":97,"y2":47,"type":"solid"}]');
