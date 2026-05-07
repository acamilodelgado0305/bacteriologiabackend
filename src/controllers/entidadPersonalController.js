const { randomUUID } = require('crypto');
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');

const listar = async (req, res, next) => {
  try {
    const { id: entidadId } = req.params;

    const entidad = await prisma.entidad.findUnique({ where: { id: entidadId } });
    if (!entidad) return error(res, 'Entidad no encontrada', 404);

    const personal = await prisma.entidadPersonal.findMany({
      where: { entidadId },
      include: {
        usuario: {
          select: { id: true, nombre: true, apellido: true, email: true, rol: true, activo: true },
        },
      },
      orderBy: [{ usuario: { rol: 'asc' } }, { usuario: { apellido: 'asc' } }],
    });

    return success(res, personal);
  } catch (err) {
    next(err);
  }
};

const agregar = async (req, res, next) => {
  try {
    const { id: entidadId } = req.params;
    const { usuarioId } = req.body;

    if (!usuarioId) return error(res, 'usuarioId es requerido', 400);

    const entidad = await prisma.entidad.findUnique({ where: { id: entidadId } });
    if (!entidad) return error(res, 'Entidad no encontrada', 404);

    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) return error(res, 'Usuario no encontrado', 404);
    if (!['docente', 'bacteriologo'].includes(usuario.rol)) {
      return error(res, 'Solo se pueden asociar docentes o bacteriólogos a una entidad', 400);
    }

    const existe = await prisma.entidadPersonal.findUnique({
      where: { entidadId_usuarioId: { entidadId, usuarioId } },
    });
    if (existe) return error(res, 'Este usuario ya está asociado a la entidad', 409);

    const registro = await prisma.entidadPersonal.create({
      data: { id: randomUUID(), entidadId, usuarioId },
      include: {
        usuario: {
          select: { id: true, nombre: true, apellido: true, email: true, rol: true },
        },
      },
    });

    return success(res, registro, 'Personal asociado a la entidad', 201);
  } catch (err) {
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    const { id: entidadId, usuarioId } = req.params;

    const registro = await prisma.entidadPersonal.findUnique({
      where: { entidadId_usuarioId: { entidadId, usuarioId } },
    });
    if (!registro) return error(res, 'Asociación no encontrada', 404);

    await prisma.entidadPersonal.delete({
      where: { entidadId_usuarioId: { entidadId, usuarioId } },
    });

    return success(res, null, 'Personal desasociado de la entidad');
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, agregar, eliminar };
