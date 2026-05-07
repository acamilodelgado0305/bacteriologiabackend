-- Migración v3: Asociar docentes/bacteriólogos a entidades en lugar de estudiantes
-- Los supervisores ya no van por estudiante sino por entidad.
-- El registro diario guarda qué docente y bacteriólogo supervisaron ESE DÍA.
-- Nota: Prisma almacena todos los IDs como TEXT (no UUID nativo).

-- 1. Crear tabla entidad_personal (pivot entre entidades y sus supervisores)
CREATE TABLE IF NOT EXISTS entidad_personal (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  entidad_id  TEXT        NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
  usuario_id  TEXT        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entidad_id, usuario_id)
);

-- 2. Agregar columnas de supervisor al registro diario
ALTER TABLE registros_diarios
  ADD COLUMN IF NOT EXISTS docente_supervisor_id      TEXT REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS bacteriologo_supervisor_id TEXT REFERENCES usuarios(id);

-- 3. Quitar columnas de supervisor de estudiantes
ALTER TABLE estudiantes
  DROP COLUMN IF EXISTS docente_supervisor_id,
  DROP COLUMN IF EXISTS bacteriologo_supervisor_id;
