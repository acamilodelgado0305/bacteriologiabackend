-- ============================================================
-- MIGRACIÓN V2 - Nuevas tablas: entidades, examenes,
--   estudiantes (rediseño), registros_diarios, registros_examenes
-- Ejecutar en: Supabase → SQL Editor → New Query
-- IMPORTANTE: Ejecutar DESPUÉS de migration_inicial.sql
-- ============================================================

-- 1. Eliminar tabla estudiantes anterior (si existe con estructura vieja)
DROP TABLE IF EXISTS "estudiantes" CASCADE;

-- 2. Crear tabla entidades
CREATE TABLE "entidades" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "direccion" VARCHAR(300),
    "ciudad" VARCHAR(100),
    "departamento" VARCHAR(100),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "entidades_pkey" PRIMARY KEY ("id")
);

-- 3. Crear tabla examenes
CREATE TABLE "examenes" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "area" VARCHAR(100),
    "entidad_id" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "examenes_pkey" PRIMARY KEY ("id")
);

-- 4. Crear tabla estudiantes (rediseñada)
CREATE TABLE "estudiantes" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "numero_documento" VARCHAR(20) NOT NULL,
    "semestre" "Semestre" NOT NULL,
    "entidad_id" TEXT,
    "docente_supervisor_id" TEXT,
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "estudiantes_pkey" PRIMARY KEY ("id")
);

-- 5. Crear tabla registros_diarios
CREATE TABLE "registros_diarios" (
    "id" TEXT NOT NULL,
    "estudiante_id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "observaciones" TEXT,
    "firmado" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "registros_diarios_pkey" PRIMARY KEY ("id")
);

-- 6. Crear tabla registros_examenes (detalle del registro)
CREATE TABLE "registros_examenes" (
    "id" TEXT NOT NULL,
    "registro_id" TEXT NOT NULL,
    "examen_id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "registros_examenes_pkey" PRIMARY KEY ("id")
);

-- Índices únicos
CREATE UNIQUE INDEX "estudiantes_usuario_id_key" ON "estudiantes"("usuario_id");
CREATE UNIQUE INDEX "estudiantes_numero_documento_key" ON "estudiantes"("numero_documento");
CREATE UNIQUE INDEX "registros_diarios_estudiante_fecha_key" ON "registros_diarios"("estudiante_id", "fecha");
CREATE UNIQUE INDEX "registros_examenes_registro_examen_key" ON "registros_examenes"("registro_id", "examen_id");

-- Foreign keys: examenes → entidades
ALTER TABLE "examenes" ADD CONSTRAINT "examenes_entidad_id_fkey"
    FOREIGN KEY ("entidad_id") REFERENCES "entidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign keys: estudiantes
ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_entidad_id_fkey"
    FOREIGN KEY ("entidad_id") REFERENCES "entidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_docente_supervisor_id_fkey"
    FOREIGN KEY ("docente_supervisor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys: registros
ALTER TABLE "registros_diarios" ADD CONSTRAINT "registros_diarios_estudiante_id_fkey"
    FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registros_examenes" ADD CONSTRAINT "registros_examenes_registro_id_fkey"
    FOREIGN KEY ("registro_id") REFERENCES "registros_diarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "registros_examenes" ADD CONSTRAINT "registros_examenes_examen_id_fkey"
    FOREIGN KEY ("examen_id") REFERENCES "examenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
