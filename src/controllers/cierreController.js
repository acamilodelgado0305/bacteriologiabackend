const { randomUUID } = require('crypto');
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');

const estudianteInclude = {
  include: {
    usuario: { select: { nombre: true, apellido: true } },
    entidad: { select: { nombre: true } },
  },
};

// Cerrar el semestre actual: archiva todos los registros sin cierre
const cerrar = async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre?.trim()) return error(res, 'El nombre del cierre es requerido', 400);

    const totalEstudiantes = await prisma.estudiante.count({ where: { cierreId: null } });
    if (totalEstudiantes === 0) {
      return error(res, 'No hay estudiantes activos para cerrar', 400);
    }

    const totalRegistros = await prisma.registroDiario.count({ where: { cierreId: null } });

    const cierre = await prisma.$transaction(async (tx) => {
      const nuevoCierre = await tx.cierreSemestre.create({
        data: {
          id: randomUUID(),
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
          totalEstudiantes,
          totalRegistros,
        },
      });

      await tx.estudiante.updateMany({
        where: { cierreId: null },
        data: { cierreId: nuevoCierre.id },
      });

      await tx.registroDiario.updateMany({
        where: { cierreId: null },
        data: { cierreId: nuevoCierre.id },
      });

      return nuevoCierre;
    });

    return success(res, cierre, `Semestre cerrado: ${totalRegistros} registros archivados`);
  } catch (err) {
    next(err);
  }
};

// Listar todos los cierres
const listar = async (req, res, next) => {
  try {
    const cierres = await prisma.cierreSemestre.findMany({
      orderBy: { fechaCierre: 'desc' },
    });
    return success(res, cierres);
  } catch (err) {
    next(err);
  }
};

// Obtener un cierre con sus registros agrupados por estudiante
const obtener = async (req, res, next) => {
  try {
    const { id } = req.params;

    const cierre = await prisma.cierreSemestre.findUnique({ where: { id } });
    if (!cierre) return error(res, 'Cierre no encontrado', 404);

    // Traer estudiantes archivados en este cierre con sus registros
    const estudiantes = await prisma.estudiante.findMany({
      where: { cierreId: id },
      include: {
        usuario: { select: { nombre: true, apellido: true } },
        entidad: { select: { nombre: true } },
        registros: {
          where: { cierreId: id },
          orderBy: { fecha: 'desc' },
          include: {
            docenteSupervisor: { select: { id: true, nombre: true, apellido: true } },
            bacteriologoSupervisor: { select: { id: true, nombre: true, apellido: true } },
            examenes: {
              include: { examen: { select: { nombre: true, area: true } } },
            },
          },
        },
      },
    });

    const estudiantesConTotales = estudiantes.map((e) => ({
      estudiante: e,
      registros: e.registros,
      totalExamenes: e.registros.reduce(
        (sum, r) => sum + r.examenes.reduce((s, ex) => s + ex.cantidad, 0),
        0
      ),
    }));

    return success(res, {
      cierre,
      estudiantes: estudiantesConTotales,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { cerrar, listar, obtener };
