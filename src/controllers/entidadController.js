const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');

const listar = async (req, res, next) => {
  try {
    const { activo } = req.query;
    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';

    const entidades = await prisma.entidad.findMany({
      where,
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { estudiantes: { where: { cierreId: null } }, examenes: true } },
      },
    });
    return success(res, entidades);
  } catch (err) {
    next(err);
  }
};

const obtener = async (req, res, next) => {
  try {
    const entidad = await prisma.entidad.findUnique({
      where: { id: req.params.id },
      include: {
        examenes: { where: { activo: true }, orderBy: { area: 'asc' } },
        personal: {
          include: {
            usuario: {
              select: { id: true, nombre: true, apellido: true, email: true, rol: true, activo: true },
            },
          },
          orderBy: [{ usuario: { rol: 'asc' } }, { usuario: { apellido: 'asc' } }],
        },
        _count: { select: { estudiantes: { where: { cierreId: null } } } },
      },
    });
    if (!entidad) return error(res, 'Entidad no encontrada', 404);
    return success(res, entidad);
  } catch (err) {
    next(err);
  }
};

const crear = async (req, res, next) => {
  try {
    const { nombre, direccion, ciudad, departamento } = req.body;
    const entidad = await prisma.entidad.create({
      data: { nombre, direccion, ciudad, departamento },
    });
    return success(res, entidad, 'Entidad creada', 201);
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const campos = ['nombre', 'direccion', 'ciudad', 'departamento', 'activo'];
    const data = {};
    campos.forEach((c) => { if (req.body[c] !== undefined) data[c] = req.body[c]; });

    const entidad = await prisma.entidad.update({
      where: { id: req.params.id },
      data,
    });
    return success(res, entidad, 'Entidad actualizada');
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Entidad no encontrada', 404);
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const entidad = await prisma.entidad.findUnique({
      where: { id },
      include: { examenes: { select: { id: true } } },
    });
    if (!entidad) return error(res, 'Entidad no encontrada', 404);

    await prisma.$transaction(async (tx) => {
      // Borrar registros de exámenes asociados a los exámenes de esta entidad
      if (entidad.examenes.length > 0) {
        const examenIds = entidad.examenes.map((e) => e.id);
        await tx.registroExamen.deleteMany({ where: { examenId: { in: examenIds } } });
        await tx.examen.deleteMany({ where: { entidadId: id } });
      }
      // Desvincular estudiantes (entidadId → null)
      await tx.estudiante.updateMany({ where: { entidadId: id }, data: { entidadId: null } });
      // Eliminar entidad (EntidadPersonal cascadea automáticamente)
      await tx.entidad.delete({ where: { id } });
    });

    return success(res, { eliminado: true }, 'Entidad eliminada permanentemente');
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Entidad no encontrada', 404);
    next(err);
  }
};

module.exports = { listar, obtener, crear, actualizar, eliminar };
