-- Migración v5: Cierre de Semestre
-- Permite archivar estudiantes y registros del semestre actual y empezar de cero.
-- Entidades y supervisores (docentes/bacteriólogos) se mantienen intactos.

CREATE TABLE IF NOT EXISTS cierres_semestre (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nombre            TEXT NOT NULL,
  descripcion       TEXT,
  fecha_cierre      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_estudiantes INT NOT NULL DEFAULT 0,
  total_registros   INT NOT NULL DEFAULT 0,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE estudiantes
  ADD COLUMN IF NOT EXISTS cierre_id TEXT REFERENCES cierres_semestre(id);

ALTER TABLE registros_diarios
  ADD COLUMN IF NOT EXISTS cierre_id TEXT REFERENCES cierres_semestre(id);
