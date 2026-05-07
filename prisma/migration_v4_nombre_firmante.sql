-- Migración v4: Capturar nombre del firmante en registros diarios
-- Necesario porque una cuenta de bacteriólogo (y potencialmente docente)
-- puede ser compartida por varias personas físicas en la entidad.

ALTER TABLE registros_diarios
  ADD COLUMN IF NOT EXISTS nombre_firmante_docente      TEXT,
  ADD COLUMN IF NOT EXISTS nombre_firmante_bacteriologo TEXT;
