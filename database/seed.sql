-- ============================================================
-- Fisio IA Agent - Datos de ejemplo (seed) en espanol
-- ============================================================

INSERT INTO dolencias (nombre, zona_corporal, descripcion, niveles_severidad) VALUES
  ('Lumbalgia', 'espalda baja', 'Dolor en la zona lumbar de origen mecanico o postural.', ARRAY['leve', 'moderada', 'severa']),
  ('Cervicalgia', 'cuello', 'Dolor cervical con posible irradiacion a hombros.', ARRAY['leve', 'moderada', 'severa']),
  ('Tendinitis de hombro', 'hombro', 'Inflamacion de los tendones del manguito rotador.', ARRAY['leve', 'moderada']),
  ('Esguince de tobillo', 'tobillo', 'Lesion ligamentosa por inversion del pie.', ARRAY['grado_I', 'grado_II', 'grado_III']),
  ('Fascitis plantar', 'pie', 'Inflamacion de la fascia plantar con dolor al apoyo.', ARRAY['leve', 'moderada', 'severa']),
  ('Epicondilitis', 'codo', 'Dolor en el epicondilo lateral (codo de tenista).', ARRAY['leve', 'moderada']),
  ('Sindrome del tunel carpiano', 'muneca', 'Compresion del nervio mediano en el tunel carpiano.', ARRAY['leve', 'moderada', 'severa']),
  ('Gonartrosis', 'rodilla', 'Artrosis de rodilla con desgaste del cartilago articular.', ARRAY['leve', 'moderada', 'severa']);

INSERT INTO ejercicios (dolencia_id, nombre, descripcion, fase, dificultad, series_defecto, repeticiones_defecto, duracion_segundos_defecto) VALUES
  ((SELECT id FROM dolencias WHERE nombre = 'Lumbalgia'), 'Respiracion diafragmatica', 'Tumbado boca arriba, rodillas flexionadas. Inspirar hinchando abdomen, espirar controladamente.', 'aguda', 'basico', 3, 10, 60),
  ((SELECT id FROM dolencias WHERE nombre = 'Lumbalgia'), 'Basculacion pelvica', 'Tumbado boca arriba, rodillas flexionadas. Llevar ombligo hacia suelo y relajar alternativamente.', 'aguda', 'basico', 3, 12, NULL),
  ((SELECT id FROM dolencias WHERE nombre = 'Lumbalgia'), 'Puente gluteo', 'Tumbado boca arriba, rodillas flexionadas. Elevar pelvis contrayendo gluteos. Mantener 3s arriba.', 'subaguda', 'intermedio', 3, 12, NULL),
  ((SELECT id FROM dolencias WHERE nombre = 'Lumbalgia'), 'Bird-dog', 'A cuatro apoyos, extender brazo y pierna contralaterales manteniendo estabilidad lumbar.', 'subaguda', 'intermedio', 3, 10, NULL),
  ((SELECT id FROM dolencias WHERE nombre = 'Lumbalgia'), 'Plancha frontal', 'Sobre antebrazos y puntas de pies, mantener cuerpo alineado. Evitar hundimiento lumbar.', 'cronica', 'avanzado', 3, 1, 30),
  ((SELECT id FROM dolencias WHERE nombre = 'Lumbalgia'), 'Sentadilla con kettlebell', 'Peso frontal, descender hasta paralelo controlando zona lumbar.', 'mantenimiento', 'avanzado', 3, 12, NULL),

  ((SELECT id FROM dolencias WHERE nombre = 'Cervicalgia'), 'Retraccion cervical', 'Sentado, llevar la barbilla hacia atras sin inclinar la cabeza.', 'aguda', 'basico', 3, 10, NULL),
  ((SELECT id FROM dolencias WHERE nombre = 'Cervicalgia'), 'Estiramientos cervicales laterales', 'Inclinar oreja hacia hombro suavemente, mantener 20s cada lado.', 'aguda', 'basico', 2, 3, 20),
  ((SELECT id FROM dolencias WHERE nombre = 'Cervicalgia'), 'Flexion isometrica con resistencia', 'Mano en frente, empujar cabeza contra mano sin mover. Mantener 5s.', 'subaguda', 'intermedio', 3, 8, NULL),
  ((SELECT id FROM dolencias WHERE nombre = 'Cervicalgia'), 'Remo con banda elastica', 'Tirar banda hacia el pecho retrayendo escapulas, mantener 2s.', 'cronica', 'intermedio', 3, 12, NULL),

  ((SELECT id FROM dolencias WHERE nombre = 'Tendinitis de hombro'), 'Pendulos de Codman', 'Inclinado hacia delante, dejar brazo colgando y realizar circulos suaves.', 'aguda', 'basico', 2, 20, 60),
  ((SELECT id FROM dolencias WHERE nombre = 'Tendinitis de hombro'), 'Rotacion externa con banda', 'Codo pegado al cuerpo, rotar antebrazo hacia fuera contra resistencia.', 'subaguda', 'intermedio', 3, 12, NULL),
  ((SELECT id FROM dolencias WHERE nombre = 'Tendinitis de hombro'), 'Elevacion lateral con mancuerna', 'Elevar brazos lateralmente hasta 90 grados de forma controlada.', 'cronica', 'avanzado', 3, 10, NULL),

  ((SELECT id FROM dolencias WHERE nombre = 'Esguince de tobillo'), 'Movilidad activa en descarga', 'Sentado, realizar movimientos circulares con el tobillo sin apoyo del pie.', 'aguda', 'basico', 3, 15, NULL),
  ((SELECT id FROM dolencias WHERE nombre = 'Esguince de tobillo'), 'Propiocepcion en apoyo monopodal', 'De pie sobre la pierna afectada, mantener equilibrio. Progresar cerrando ojos.', 'subaguda', 'intermedio', 3, 1, 30),
  ((SELECT id FROM dolencias WHERE nombre = 'Esguince de tobillo'), 'Saltos con recepcion controlada', 'Saltar y aterrizar sobre una pierna, controlando la estabilidad del tobillo.', 'cronica', 'avanzado', 3, 8, NULL);
