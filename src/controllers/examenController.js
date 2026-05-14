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

const importar = async (req, res, next) => {
  try {
    const { entidadId } = req.params;
    const { origenId, examenIds = [] } = req.body;

    if (!origenId) return error(res, 'ID de entidad origen requerido', 400);
    if (!examenIds.length) return error(res, 'Selecciona al menos un examen', 400);

    const [origen, destino] = await Promise.all([
      prisma.entidad.findUnique({ where: { id: origenId } }),
      prisma.entidad.findUnique({ where: { id: entidadId } }),
    ]);
    if (!origen)  return error(res, 'Entidad origen no encontrada', 404);
    if (!destino) return error(res, 'Entidad destino no encontrada', 404);

    const examenesOrigen = await prisma.examen.findMany({
      where: { entidadId: origenId, id: { in: examenIds } },
    });

    const examenesDestino = await prisma.examen.findMany({
      where: { entidadId },
      select: { nombre: true, area: true },
    });
    const existentes = new Set(examenesDestino.map((e) => `${e.nombre}__${e.area ?? ''}`));

    const nuevos = examenesOrigen.filter(
      (e) => !existentes.has(`${e.nombre}__${e.area ?? ''}`)
    );

    if (nuevos.length === 0) {
      return success(res, [], 'Todos los exámenes seleccionados ya existen en esta entidad');
    }

    const creados = await prisma.$transaction(
      nuevos.map((e) => prisma.examen.create({ data: { nombre: e.nombre, area: e.area, entidadId } }))
    );

    const omitidos = examenesOrigen.length - creados.length;
    const msg = omitidos > 0
      ? `${creados.length} importado${creados.length !== 1 ? 's' : ''}, ${omitidos} ya existía${omitidos !== 1 ? 'n' : ''}`
      : `${creados.length} examen${creados.length !== 1 ? 'es' : ''} importado${creados.length !== 1 ? 's' : ''}`;

    return success(res, creados, msg, 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { listarPorEntidad, crear, actualizar, importar };
