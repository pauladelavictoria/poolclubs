-- =============================================
-- Drill catalog seed 2: ejercicios con nombre propio de la coleccion de
-- Dr. Dave Alciatore (drdavepoolinfo.com) y de sus autores originales
-- =============================================
--
-- Ejecutar DESPUES de sql/drills-seed-bu.sql (ese fichero hace DELETE FROM
-- drills; este solo añade). Este fichero es idempotente: borra sus propias
-- filas por nombre antes de insertarlas.
--
-- Fuentes y autoria de cada ejercicio (indicada tambien en la descripcion):
--   3-Ball Runout .......... ejercicio clasico, recopilado por Dr. Dave
--                            https://drdavepoolinfo.com/faq/drill/3-ball/
--   Spot Shot Challenge .... reto de la comunidad, recopilado por Dr. Dave
--                            https://drdavepoolinfo.com/faq/drill/spot-shot/
--   Mighty X ............... Darren Appleton (Billiards Digest, nov. 2018)
--                            https://drdavepoolinfo.com/faq/drill/mighty-x-drill/
--   Cue Ball Vision ........ Tom Karsay
--                            https://drdavepoolinfo.com/faq/drill/safety/
--   RDS 100 ................ Bob Jewett y David Alciatore (BD, oct. 2020)
--                            https://drdavepoolinfo.com/faq/drill/rds/
-- El reto PPC 100 no esta aqui: sus 18 disposiciones son 18 ejercicios
-- independientes en sql/drills-seed-ppc.sql.
--
-- OJO CON EL BAREMO: a diferencia de los ejercicios de BU, estos no siempre
-- traen una formula de puntuacion publicada. Donde no la hay, el baremo es
-- nuestro (numero de aciertos sobre un total fijo de intentos) y se marca en
-- scoring_method con el prefijo "(baremo propio)". El montaje y el
-- procedimiento si son de la fuente.
-- =============================================

DELETE FROM drills WHERE name IN (
  'Runout de 3 bolas',
  'Reto del tiro del punto',
  'Mighty X',
  'Vision de la blanca',
  'RDS 100 - 16 rachas'
);

INSERT INTO drills (name, description, difficulty, skill_type, setup_instructions, scoring_method, max_score, ball_positions, shot_paths) VALUES

('Runout de 3 bolas',
 'El ejercicio ofensivo mas simple y mas util: tres bolas al azar, blanca a mano, y a correr la tirada. Recopilado por Dr. Dave.',
 'beginner', 'patterns',
 'Lanza tres bolas a la mesa al azar (por ejemplo la 1, la 2 y la 3). Si alguna cae en tronera, vuelve a lanzarla. Coge blanca a mano y emboca las tres en orden numerico. Cada tirada completada cuenta como un acierto. Cuando completes 18 de 20, sube a cuatro bolas, y sigue subiendo: 15 bolas es nivel profesional.',
 '(baremo propio) 20 tiradas. 1 punto por cada tirada de 3 bolas completada. Maximo 20.',
 20,
 '[{"x":22,"y":30,"color":"white","label":"a mano"},{"x":40,"y":16,"color":"yellow","label":"1"},{"x":66,"y":33,"color":"blue","label":"2"},{"x":85,"y":14,"color":"red","label":"3"}]',
 '[]'),

('Reto del tiro del punto',
 'Emboca la bola del punto del pie y devuelve la blanca a la cocina, una y otra vez, hasta fallar. Reto clasico de la comunidad, recopilado por Dr. Dave.',
 'intermediate', 'position',
 'Coloca la bola objetivo en el punto del pie. Coge blanca a mano dentro de la cocina (detras de la linea de cabecera). Emboca la objetivo en una esquina y deja la blanca de nuevo dentro de la cocina. Vuelve a colocar la objetivo en el punto del pie y repite. La racha termina si fallas la bola o si la blanca no acaba en la cocina.',
 '(baremo propio) Puntuacion = bolas embocadas seguidas en la mejor racha, con tope de 20.',
 20,
 '[{"x":12.5,"y":30,"color":"white","label":"a mano en cocina"},{"x":75,"y":25,"color":"yellow","label":"objetivo"}]',
 '[{"x1":12.5,"y1":30,"x2":73.5,"y2":25.5,"type":"solid"},{"x1":75,"y1":25,"x2":98,"y2":2,"type":"dashed"}]'),

('Mighty X',
 'Dos tiros largos que se cruzan en X: cada bola de la cabecera hace de blanca para embocar en diagonal la del pie. Ejercicio de Darren Appleton.',
 'advanced', 'potting',
 'Cuatro bolas, ninguna blanca. La 1 y la 2 sobre la linea del segundo diamante desde la cabecera: la 2 un diamante por debajo de la banda superior y la 1 un diamante por encima de la inferior. La 3 y la 4 sobre la linea del punto del pie: la 3 un diamante por debajo de la banda superior y la 4 un diamante por encima de la inferior. Usa la 2 como blanca para embocar la 4 en la esquina inferior derecha, y la 1 como blanca para embocar la 3 en la esquina superior derecha: las dos lineas de tiro se cruzan formando la X. Luego al reves, usando la 3 y la 4 como blancas para embocar la 1 y la 2 en las esquinas de la izquierda. Recoloca las bolas despues de cada tiro. Son tiros rectos y largos: trabaja las tres respuestas de la blanca sobre la diagonal (parada, seguimiento y retroceso).',
 '(baremo propio) 20 tiros (5 por cada una de las cuatro combinaciones). 1 punto por bola embocada. Maximo 20.',
 20,
 '[{"x":25,"y":12.5,"color":"blue","label":"2"},{"x":25,"y":37.5,"color":"yellow","label":"1"},{"x":75,"y":12.5,"color":"red","label":"3"},{"x":75,"y":37.5,"color":"purple","label":"4"}]',
 '[{"x1":25,"y1":12.5,"x2":73.5,"y2":36.75,"type":"solid"},{"x1":25,"y1":37.5,"x2":73.5,"y2":13.25,"type":"solid"},{"x1":75,"y1":12.5,"x2":98.5,"y2":0.75,"type":"dashed"},{"x1":75,"y1":37.5,"x2":98.5,"y2":49.25,"type":"dashed"}]'),

('Vision de la blanca',
 'Pasea la blanca por toda la mesa y vuelve al punto de partida sin tocar ninguna bola. Ejercicio de Tom Karsay.',
 'intermediate', 'safety',
 'Reparte las bolas al azar por la mesa y coloca la blanca donde quieras (por ejemplo en la cocina). Marca su sitio con una pegatina. Mueve la blanca por la mesa y devuelvela a su posicion de partida sin tocar ninguna bola. Cuando encuentres un recorrido, busca otro distinto, y otro. Entrena la vision de los caminos libres, que es la base del juego defensivo y de los kicks.',
 '(baremo propio) 1 punto por cada recorrido distinto que completes sin tocar bola. Maximo 10.',
 10,
 '[{"x":12.5,"y":25,"color":"white","label":"salida y llegada"},{"x":34,"y":12,"color":"yellow"},{"x":45,"y":33,"color":"blue"},{"x":58,"y":20,"color":"red"},{"x":70,"y":40,"color":"purple"},{"x":80,"y":18,"color":"orange"},{"x":90,"y":31,"color":"green"}]',
 '[]'),

('RDS 100 - 16 rachas',
 'Dieciseis rachas de dificultad creciente, de bola a mano a rompe y corre. Sistema de Bob Jewett y David Alciatore.',
 'advanced', 'patterns',
 'El Runout Drill System son 16 retos de rompe y corre de dificultad creciente, que se juegan en orden. Descarga el documento oficial con los 16 niveles y sus disposiciones en https://drdavepoolinfo.com/faq/drill/rds/ (hay tambien una hoja resumen de una pagina de Shane McEwan). Se juega una tanda por nivel, en orden, con reglas WPA y falta solo de blanca. Puedes armar las bolas en cualquier patron legal. En 8 bolas solo cuentan las de tu grupo mas la 8. Si te equivocas en la salida, ese nivel se queda a cero.',
 'Empiezas con 100 puntos y restas las bolas que dejas en la mesa tras fallo o falta, nivel a nivel. Puntuacion = lo que quede de 100. Una tirada perfecta en los 16 niveles = 100.',
 100,
 '[{"x":12.5,"y":25,"color":"white","label":"a mano"},{"x":75,"y":25,"color":"yellow"},{"x":78,"y":23,"color":"blue"},{"x":78,"y":27,"color":"red"},{"x":81,"y":25,"color":"purple"},{"x":81,"y":21,"color":"orange"},{"x":81,"y":29,"color":"green"}]',
 '[{"x1":12.5,"y1":25,"x2":73,"y2":25,"type":"solid"}]');
