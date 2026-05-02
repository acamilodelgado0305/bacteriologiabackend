const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');

const listarPorEntidad = async (req, res, next) => {
  try {
    const { entidadId } = req.params;
    const entidad = await prisma.entidad.findUnique({ where: { id: entidadId } });
    if (!entidad) return error(res, 'Entidad no encontrada', 404);

    const examenes = await prisma.examen.findMany({
      where: { entidadId },
      orderBy: [{ area: 'asc' }, { nombre: 'asc' }],
    });
    return success(res, examenes);
  } catch (err) {
    next(err);
  }
};

const crear = async (req, res, next) => {
  try {
    const { entidadId } = req.params;
    const { nombre, area } = req.body;

    const entidad = await prisma.entidad.findUnique({ where: { id: entidadId } });
    if (!entidad) return error(res, 'Entidad no encontrada', 404);

    const examen = await prisma.examen.create({
      data: { nombre, area, entidadId },
    });
    return success(res, examen, 'Examen creado', 201);
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const data = {};
    ['nombre', 'area', 'activo'].forEach((c) => {
      if (req.body[c] !== undefined) data[c] = req.body[c];
    });

    const examen = await prisma.examen.update({
      where: { id: req.params.examenId },
      data,
    });
    return success(res, examen, 'Examen actualizado');
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Examen no encontrado', 404);
    next(err);
  }
};

module.exports = { listarPorEntidad, crear, actualizar };
