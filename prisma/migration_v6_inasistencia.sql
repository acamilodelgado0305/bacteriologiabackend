-- Migración v6: Inasistencia en el registro diario
-- Permite que el estudiante marque un día como "No asistió" y deje un comentario
-- (se reutiliza el campo observaciones como motivo de la inasistencia).

ALTER TABLE registros_diarios
  ADD COLUMN IF NOT EXISTS no_asistio BOOLEAN NOT NULL DEFAULT false;
