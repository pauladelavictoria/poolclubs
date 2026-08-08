-- =============================================
-- Drill catalog seed 3: las 18 disposiciones del Placement Pool Challenge
-- =============================================
--
-- Fuente (leida directamente, no de segunda mano):
--   BU Exam V - Placement Pool Challenge (PPC)
--   https://billiarduniversity.org/documents/BU_Exam-V_Placement_Pool_Challenge_BW.pdf
--   Billiard University / David Alciatore. Son las 18 disposiciones de tirada
--   de 9 bolas y de 8 bolas de BU Exam II en sus tres niveles.
--
-- Cada disposicion es una fila: 6 de Bachelor (5 bolas cada una), 6 de Master
-- (6 bolas) y 6 de Doctorate (7 bolas). Total 108 bolas, que es exactamente lo
-- que el PDF pide para un PPC 100 perfecto ("108 straight shots with no
-- misses"): sirve de comprobacion de que las 18 estan bien transcritas.
--
-- Puntuacion: la del propio examen, 1 punto por bola embocada legalmente antes
-- del fallo o la falta. No hay baremo inventado en este fichero.
--
-- Ejecutar DESPUES de sql/drills-seed-bu.sql (ese hace DELETE FROM drills).
-- Idempotente: borra sus propias filas por nombre antes de insertarlas.
--
-- Los diagramas son una transcripcion esquematica sobre nuestra mesa de
-- 100x50 (1 diamante = 12.5). Las disposiciones oficiales, con las notas de
-- huecos de media bola y bolas congeladas, estan en el PDF de arriba.
-- =============================================

DELETE FROM drills WHERE name LIKE 'PPC %';

INSERT INTO drills (name, description, difficulty, skill_type, setup_instructions, scoring_method, max_score, ball_positions, shot_paths) VALUES

-- ---------- Bachelor: 5 bolas por disposicion ----------

('PPC 01 · 9 bolas Bachelor 1',
 'Cinco bolas abiertas en la mitad de cabecera. Primera de las 18 disposiciones del PPC.',
 'intermediate', 'patterns',
 'Coloca las bolas 5, 6, 7, 8 y 9 segun el diagrama. Blanca a mano para empezar. Emboca en rotacion, golpeando siempre primero la bola de numero mas bajo. Reglas WPA con falta solo de blanca. Vale la chorra: si el golpe a la bola mas baja es legal, cuenta la bola que entre. Si entra la 9 con un golpe legal en cualquier momento, se te acreditan todas las bolas de la disposicion. Las bolas que entren en el tiro de la falta no cuentan.',
 '1 punto por cada bola embocada legalmente antes del fallo o la falta. Maximo 5.',
 5,
 '[{"x":12.5,"y":12.5,"color":"orange","label":"5"},{"x":37.5,"y":12.5,"color":"black","label":"8"},{"x":62.5,"y":12.5,"color":"yellow","label":"9"},{"x":12.5,"y":37.5,"color":"maroon","label":"7"},{"x":37.5,"y":37.5,"color":"green","label":"6"}]',
 '[]'),

('PPC 02 · 9 bolas Bachelor 2',
 'Cuatro bolas pegadas a las bandas cortas y la 8 junto a la banda inferior.',
 'intermediate', 'patterns',
 'Coloca las bolas segun el diagrama: la 5 a medio hueco de bola de la banda corta izquierda, la 6 debajo de ella tambien junto a esa banda, la 9 y la 7 enfrentadas junto a la banda corta derecha, y la 8 cerca de la banda inferior. Blanca a mano para empezar. Emboca en rotacion, golpeando siempre primero la bola de numero mas bajo. Reglas WPA con falta solo de blanca. Vale la chorra con golpe legal a la bola mas baja. Si entra la 9 legalmente en cualquier momento, se acreditan todas las bolas.',
 '1 punto por cada bola embocada legalmente antes del fallo o la falta. Maximo 5.',
 5,
 '[{"x":2.5,"y":12.5,"color":"orange","label":"5"},{"x":2.5,"y":37.5,"color":"green","label":"6"},{"x":96,"y":12.5,"color":"yellow","label":"9"},{"x":96,"y":37.5,"color":"maroon","label":"7"},{"x":37,"y":46.5,"color":"black","label":"8"}]',
 '[]'),

('PPC 03 · 9 bolas Bachelor 3',
 'Grupo apretado en el cuarto del pie y la 9 sola en la esquina opuesta.',
 'intermediate', 'patterns',
 'Coloca las bolas segun el diagrama: la 9 a medio hueco de bola de la banda superior, cerca de la esquina de cabecera; la 6 junto a la banda corta derecha; y la 5, la 7 y la 8 agrupadas en el cuarto del pie, con la 7 y la 8 casi tocandose. Blanca a mano para empezar. Emboca en rotacion, golpeando siempre primero la bola de numero mas bajo. Reglas WPA con falta solo de blanca. Vale la chorra con golpe legal a la bola mas baja. Si entra la 9 legalmente en cualquier momento, se acreditan todas las bolas.',
 '1 punto por cada bola embocada legalmente antes del fallo o la falta. Maximo 5.',
 5,
 '[{"x":12.5,"y":2.5,"color":"yellow","label":"9"},{"x":93,"y":12.5,"color":"green","label":"6"},{"x":74.5,"y":27.5,"color":"black","label":"8"},{"x":77.5,"y":27.5,"color":"maroon","label":"7"},{"x":73,"y":33.5,"color":"orange","label":"5"}]',
 '[]'),

('PPC 04 · 8 bolas Bachelor 1',
 'Cuatro bolas de un grupo repartidas y la 8 al fondo: sin bolas obstaculo.',
 'intermediate', 'patterns',
 'Coloca 4 bolas de un mismo grupo y la 8 segun el diagrama, todas en zona abierta. Blanca a mano para empezar. Emboca las 4 del grupo en el orden que quieras y despues la 8. Reglas WPA con falta solo de blanca. Las bolas que entren en el tiro de la falta no cuentan.',
 '1 punto por cada bola embocada legalmente antes del fallo o la falta. Maximo 5.',
 5,
 '[{"x":12.5,"y":12.5,"color":"blue","label":"raya"},{"x":12.5,"y":37.5,"color":"blue","label":"raya"},{"x":50,"y":37.5,"color":"blue","label":"raya"},{"x":87.5,"y":37.5,"color":"blue","label":"raya"},{"x":87.5,"y":12.5,"color":"black","label":"8"}]',
 '[]'),

('PPC 05 · 8 bolas Bachelor 2',
 'Cuatro bolas de un grupo mas la 8 pegada a banda, con dos bolas obstaculo en medio.',
 'intermediate', 'patterns',
 'Coloca 4 bolas de un mismo grupo, la 8 pegada a la banda corta derecha y 2 bolas del grupo contrario como obstaculo, segun el diagrama. La bola de grupo mas baja queda a medio hueco de bola de la banda inferior. Blanca a mano para empezar. Emboca las 4 del grupo en el orden que quieras y despues la 8. Puedes tocar las bolas obstaculo. Reglas WPA con falta solo de blanca.',
 '1 punto por cada bola embocada legalmente antes del fallo o la falta. Maximo 5.',
 5,
 '[{"x":87.5,"y":25,"color":"blue","label":"raya"},{"x":50,"y":37.5,"color":"blue","label":"raya"},{"x":87.5,"y":37.5,"color":"blue","label":"raya"},{"x":75,"y":46,"color":"blue","label":"raya"},{"x":98,"y":37.5,"color":"black","label":"8"},{"x":75,"y":25,"color":"#9AA0A6","label":"obstaculo"},{"x":62.5,"y":37.5,"color":"#9AA0A6","label":"obstaculo"}]',
 '[]'),

('PPC 06 · 8 bolas Bachelor 3',
 'Cuatro bolas de un grupo en las cuatro esquinas de la mesa y dos grupos de obstaculos en el centro.',
 'intermediate', 'patterns',
 'Coloca 4 bolas de un mismo grupo y la 8 segun el diagrama: una a medio hueco de bola de la banda superior cerca de la esquina del pie, dos pegadas a la banda corta izquierda, una junto a la banda inferior del lado del pie y la 8 junto a la banda inferior del lado de cabecera. Anade dos grupitos de tres bolas del grupo contrario como obstaculo en el centro de la mesa. Blanca a mano para empezar. Emboca las 4 del grupo en el orden que quieras y despues la 8. Puedes tocar los obstaculos.',
 '1 punto por cada bola embocada legalmente antes del fallo o la falta. Maximo 5.',
 5,
 '[{"x":87,"y":2.5,"color":"blue","label":"raya"},{"x":2,"y":12.5,"color":"blue","label":"raya"},{"x":2,"y":37.5,"color":"blue","label":"raya"},{"x":87.5,"y":46,"color":"blue","label":"raya"},{"x":12.5,"y":46.5,"color":"black","label":"8"},{"x":23,"y":24,"color":"#9AA0A6"},{"x":25.5,"y":24.5,"color":"#9AA0A6"},{"x":28,"y":24,"color":"#9AA0A6"},{"x":74.5,"y":25,"color":"#9AA0A6"},{"x":77,"y":25,"color":"#9AA0A6"},{"x":79.5,"y":25,"color":"#9AA0A6"}]',
 '[]'),

-- ---------- Master: 6 bolas por disposicion ----------

('PPC 07 · 9 bolas Master 1',
 'Seis bolas en diagonal por toda la mesa y la 9 pegada a la banda superior.',
 'advanced', 'patterns',
 'Coloca las bolas 4, 5, 6, 7, 8 y 9 segun el diagrama, con la 9 a medio hueco de bola de la banda superior. Blanca a mano para empezar. Emboca en rotacion, golpeando siempre primero la bola de numero mas bajo. Reglas WPA con falta solo de blanca. Vale la chorra con golpe legal a la bola mas baja. Si entra la 9 legalmente en cualquier momento, se acreditan todas las bolas.',
 '1 punto por cada bola embocada legalmente antes del fallo o la falta. Maximo 6.',
 6,
 '[{"x":62,"y":3,"color":"yellow","label":"9"},{"x":12.5,"y":12.5,"color":"black","label":"8"},{"x":37.5,"y":12.5,"color":"green","label":"6"},{"x":25,"y":25,"color":"maroon","label":"7"},{"x":75,"y":25,"color":"orange","label":"5"},{"x":87.5,"y":37.5,"color":"purple","label":"4"}]',
 '[]'),

('PPC 08 · 9 bolas Master 2',
 'Cuatro bolas pegadas a las bandas largas, la 9 en la banda corta y la 4 en el centro del pie.',
 'advanced', 'patterns',
 'Coloca las bolas segun el diagrama: la 8 y la 6 a medio hueco de bola de la banda superior, la 7 y la 5 igual en la banda inferior, la 9 pegada a la banda corta izquierda y la 4 en el cuarto del pie. Blanca a mano para empezar. Emboca en rotacion, golpeando siempre primero la bola de numero mas bajo. Reglas WPA con falta solo de blanca. Vale la chorra con golpe legal a la bola mas baja. Si entra la 9 legalmente en cualquier momento, se acreditan todas las bolas.',
 '1 punto por cada bola embocada legalmente antes del fallo o la falta. Maximo 6.',
 6,
 '[{"x":62,"y":2.5,"color":"black","label":"8"},{"x":87,"y":2.5,"color":"green","label":"6"},{"x":2,"y":25,"color":"yellow","label":"9"},{"x":87.5,"y":25,"color":"purple","label":"4"},{"x":62,"y":47,"color":"maroon","label":"7"},{"x":87.5,"y":47,"color":"orange","label":"5"}]',
 '[]'),

('PPC 09 · 9 bolas Master 3',
 'La 7 y la 8 congeladas entre si y a la banda, junto a la tronera central.',
 'advanced', 'patterns',
 'Coloca las bolas segun el diagrama: la 6, la 4 y la 9 sobre la linea del primer diamante (la 9 a medio hueco de bola de la banda corta derecha), la 5 en el centro-pie, y la 7 y la 8 congeladas entre si y a la banda inferior, con el borde de la 8 alineado con la punta de la tronera central. Blanca a mano para empezar. Emboca en rotacion, golpeando siempre primero la bola de numero mas bajo. Reglas WPA con falta solo de blanca. Vale la chorra con golpe legal a la bola mas baja. Si entra la 9 legalmente en cualquier momento, se acreditan todas las bolas.',
 '1 punto por cada bola embocada legalmente antes del fallo o la falta. Maximo 6.',
 6,
 '[{"x":12.5,"y":12.5,"color":"green","label":"6"},{"x":62.5,"y":12.5,"color":"purple","label":"4"},{"x":96,"y":12.5,"color":"yellow","label":"9"},{"x":50,"y":37.5,"color":"orange","label":"5"},{"x":43.5,"y":47,"color":"maroon","label":"7"},{"x":46.5,"y":47,"color":"black","label":"8"}]',
 '[]'),

('PPC 10 · 8 bolas Master 1',
 'Cinco bolas de un grupo repartidas en diagonal y la 8 al fondo, sin obstaculos.',
 'advanced', 'patterns',
 'Coloca 5 bolas de un mismo grupo y la 8 segun el diagrama: una pegada a la banda corta izquierda y otra a medio hueco de bola de la banda inferior. Blanca a mano para empezar. Emboca las 5 del grupo en el orden que quieras y despues la 8. Reglas WPA con falta solo de blanca.',
 '1 punto por cada bola embocada legalmente antes del fallo o la falta. Maximo 6.',
 6,
 '[{"x":2,"y":12.5,"color":"blue","label":"raya"},{"x":12.5,"y":25,"color":"blue","label":"raya"},{"x":50,"y":25,"color":"blue","label":"raya"},{"x":87.5,"y":37.5,"color":"blue","label":"raya"},{"x":12.5,"y":46,"color":"blue","label":"raya"},{"x":87.5,"y":12.5,"color":"black","label":"8"}]',
 '[]'),

('PPC 11 · 8 bolas Master 2',
 'Cinco bolas de un grupo en dos columnas y la 8 al otro extremo, con dos obstaculos en la cabecera.',
 'advanced', 'patterns',
 'Coloca 5 bolas de un mismo grupo en las dos columnas del diagrama, la 8 a medio hueco de bola de la banda corta izquierda y 2 bolas del grupo contrario como obstaculo en la zona de cabecera (una de ellas pegada a la banda superior). Blanca a mano para empezar. Emboca las 5 del grupo en el orden que quieras y despues la 8. Puedes tocar los obstaculos.',
 '1 punto por cada bola embocada legalmente antes del fallo o la falta. Maximo 6.',
 6,
 '[{"x":50,"y":12.5,"color":"blue","label":"raya"},{"x":87.5,"y":12.5,"color":"blue","label":"raya"},{"x":50,"y":25,"color":"blue","label":"raya"},{"x":87.5,"y":25,"color":"blue","label":"raya"},{"x":50,"y":37.5,"color":"blue","label":"raya"},{"x":2,"y":37.5,"color":"black","label":"8"},{"x":25,"y":2.5,"color":"#9AA0A6","label":"obstaculo"},{"x":12.5,"y":12.5,"color":"#9AA0A6","label":"obstaculo"}]',
 '[]'),

('PPC 12 · 8 bolas Master 3',
 'Cinco bolas de un grupo por las bandas, la 8 en la esquina de cabecera y cuatro obstaculos por el medio.',
 'advanced', 'patterns',
 'Coloca 5 bolas de un mismo grupo segun el diagrama (una junto a la banda superior, una pegada a la banda corta izquierda, dos en el cuarto del pie y una junto a la banda inferior), la 8 muy cerca de la esquina inferior izquierda y 4 bolas del grupo contrario como obstaculo: dos en la zona de cabecera y dos apiladas junto a la tronera central inferior. Blanca a mano para empezar. Emboca las 5 del grupo en el orden que quieras y despues la 8. Puedes tocar los obstaculos.',
 '1 punto por cada bola embocada legalmente antes del fallo o la falta. Maximo 6.',
 6,
 '[{"x":25,"y":3,"color":"blue","label":"raya"},{"x":87,"y":12.5,"color":"blue","label":"raya"},{"x":75,"y":25,"color":"blue","label":"raya"},{"x":2,"y":37.5,"color":"blue","label":"raya"},{"x":87,"y":46,"color":"blue","label":"raya"},{"x":4.5,"y":47,"color":"black","label":"8"},{"x":12.5,"y":25,"color":"#9AA0A6"},{"x":25,"y":25,"color":"#9AA0A6"},{"x":37,"y":42,"color":"#9AA0A6"},{"x":37,"y":44.5,"color":"#9AA0A6"}]',
 '[]'),

-- ---------- Doctorate: 7 bolas por disposicion ----------

('PPC 13 · 9 bolas Doctorate 1',
 'Siete bolas repartidas por toda la mesa, tres de ellas a medio hueco de banda.',
 'advanced', 'patterns',
 'Coloca las bolas 3, 4, 5, 6, 7, 8 y 9 segun el diagrama: la 8 a medio hueco de bola de la banda superior, la 9 igual en la banda corta derecha y la 6 igual en la banda inferior. Blanca a mano para empezar. Emboca en rotacion, golpeando siempre primero la bola de numero mas bajo. Reglas WPA con falta solo de blanca. Vale la chorra con golpe legal a la bola mas baja. Si entra la 9 legalmente en cualquier momento, se acreditan todas las bolas.',
 '1 punto por cada bola embocada legalmente antes del fallo o la falta. Maximo 7.',
 7,
 '[{"x":62,"y":3,"color":"black","label":"8"},{"x":12.5,"y":12.5,"color":"purple","label":"4"},{"x":37.5,"y":25,"color":"maroon","label":"7"},{"x":50,"y":25,"color":"orange","label":"5"},{"x":96,"y":25,"color":"yellow","label":"9"},{"x":12.5,"y":37.5,"color":"red","label":"3"},{"x":25,"y":46,"color":"green","label":"6"}]',
 '[]'),

('PPC 14 · 9 bolas Doctorate 2',
 'Bolas repartidas entre la banda corta de cabecera y el centro de la mesa.',
 'advanced', 'patterns',
 'Coloca las bolas 3, 4, 5, 6, 7, 8 y 9 segun el diagrama: la 8 junto a la banda superior, la 3 y la 4 en la columna central, la 9 y la 5 pegadas a la banda corta izquierda, y la 6 y la 7 junto a la banda inferior. Blanca a mano para empezar. Emboca en rotacion, golpeando siempre primero la bola de numero mas bajo. Reglas WPA con falta solo de blanca. Vale la chorra con golpe legal a la bola mas baja. Si entra la 9 legalmente en cualquier momento, se acreditan todas las bolas.',
 '1 punto por cada bola embocada legalmente antes del fallo o la falta. Maximo 7.',
 7,
 '[{"x":37,"y":3.5,"color":"black","label":"8"},{"x":50,"y":12.5,"color":"red","label":"3"},{"x":2,"y":25,"color":"yellow","label":"9"},{"x":2,"y":37.5,"color":"orange","label":"5"},{"x":50,"y":37.5,"color":"purple","label":"4"},{"x":12.5,"y":47,"color":"green","label":"6"},{"x":75,"y":47,"color":"maroon","label":"7"}]',
 '[]'),

('PPC 15 · 9 bolas Doctorate 3',
 'Dos filas de bolas: la posicion a la 7 y a la 9 se saca con tres o cuatro bandas.',
 'advanced', 'patterns',
 'Coloca las bolas 3, 4, 5, 6, 7, 8 y 9 en dos filas segun el diagrama: la 9, la 5, la 3 y la 6 sobre la linea del primer diamante, y la 7, la 4 y la 8 sobre la del tercero. Blanca a mano para empezar. Emboca en rotacion, golpeando siempre primero la bola de numero mas bajo. La disposicion esta pensada para que la posicion a la 7 y a la 9 se saque con tres bandas (o cuatro). Reglas WPA con falta solo de blanca. Vale la chorra con golpe legal a la bola mas baja. Si entra la 9 legalmente en cualquier momento, se acreditan todas las bolas.',
 '1 punto por cada bola embocada legalmente antes del fallo o la falta. Maximo 7.',
 7,
 '[{"x":2,"y":12.5,"color":"yellow","label":"9"},{"x":50,"y":12.5,"color":"orange","label":"5"},{"x":62.5,"y":12.5,"color":"red","label":"3"},{"x":87,"y":12.5,"color":"green","label":"6"},{"x":2,"y":37.5,"color":"maroon","label":"7"},{"x":62,"y":37.5,"color":"purple","label":"4"},{"x":87,"y":37.5,"color":"black","label":"8"}]',
 '[]'),

('PPC 16 · 8 bolas Doctorate 1',
 'Seis bolas de un grupo, dos de ellas junto a las troneras centrales, y la 8 al fondo.',
 'advanced', 'patterns',
 'Coloca 6 bolas de un mismo grupo y la 8 segun el diagrama: una a un hueco de bola de la tronera central superior, otra igual en la central inferior, una pegada a la banda corta izquierda y tres en fila en el cuarto inferior. Sin bolas obstaculo. Blanca a mano para empezar. Emboca las 6 del grupo en el orden que quieras y despues la 8. Reglas WPA con falta solo de blanca.',
 '1 punto por cada bola embocada legalmente antes del fallo o la falta. Maximo 7.',
 7,
 '[{"x":53,"y":3,"color":"blue","label":"raya"},{"x":2,"y":12.5,"color":"blue","label":"raya"},{"x":25,"y":37.5,"color":"blue","label":"raya"},{"x":50,"y":37.5,"color":"blue","label":"raya"},{"x":75,"y":37.5,"color":"blue","label":"raya"},{"x":53,"y":45,"color":"blue","label":"raya"},{"x":87.5,"y":12.5,"color":"black","label":"8"}]',
 '[]'),

('PPC 17 · 8 bolas Doctorate 2',
 'Seis bolas de un grupo por los bordes, la 8 pegada a la banda corta y dos obstaculos en la cabecera.',
 'advanced', 'patterns',
 'Coloca 6 bolas de un mismo grupo segun el diagrama (una junto a la banda superior del lado del pie, dos pegadas a las bandas cortas y tres en fila en el cuarto inferior), la 8 a medio hueco de bola de la banda corta izquierda y 2 bolas del grupo contrario como obstaculo en la zona de cabecera. Blanca a mano para empezar. Emboca las 6 del grupo en el orden que quieras y despues la 8. Puedes tocar los obstaculos.',
 '1 punto por cada bola embocada legalmente antes del fallo o la falta. Maximo 7.',
 7,
 '[{"x":87,"y":3.5,"color":"blue","label":"raya"},{"x":12.5,"y":12.5,"color":"blue","label":"raya"},{"x":98,"y":12.5,"color":"blue","label":"raya"},{"x":12.5,"y":37.5,"color":"blue","label":"raya"},{"x":50,"y":37.5,"color":"blue","label":"raya"},{"x":87,"y":37.5,"color":"blue","label":"raya"},{"x":2,"y":37.5,"color":"black","label":"8"},{"x":25,"y":25,"color":"#9AA0A6","label":"obstaculo"},{"x":12.5,"y":44.5,"color":"#9AA0A6","label":"obstaculo"}]',
 '[]'),

('PPC 18 · 8 bolas Doctorate 3',
 'Cinco bolas de un grupo en fila mas una pegada a banda, la 8 en la esquina y cinco obstaculos por el medio.',
 'advanced', 'patterns',
 'Coloca 6 bolas de un mismo grupo segun el diagrama: cinco en fila sobre la linea del tercer diamante (dos de ellas pegadas a las bandas cortas) y una pegada a la banda corta derecha arriba. La 8 va muy cerca de la esquina inferior izquierda. Anade 5 bolas del grupo contrario como obstaculo: tres repartidas por la linea central y dos apiladas junto a la tronera central inferior. Blanca a mano para empezar. Emboca las 6 del grupo en el orden que quieras y despues la 8. Puedes tocar los obstaculos.',
 '1 punto por cada bola embocada legalmente antes del fallo o la falta. Maximo 7.',
 7,
 '[{"x":98,"y":12.5,"color":"blue","label":"raya"},{"x":2,"y":37.5,"color":"blue","label":"raya"},{"x":25,"y":37.5,"color":"blue","label":"raya"},{"x":50,"y":37.5,"color":"blue","label":"raya"},{"x":75,"y":37.5,"color":"blue","label":"raya"},{"x":98,"y":37.5,"color":"blue","label":"raya"},{"x":4.5,"y":47,"color":"black","label":"8"},{"x":12.5,"y":25,"color":"#9AA0A6"},{"x":25,"y":25,"color":"#9AA0A6"},{"x":87,"y":25,"color":"#9AA0A6"},{"x":37,"y":42,"color":"#9AA0A6"},{"x":37,"y":44.5,"color":"#9AA0A6"}]',
 '[]');
