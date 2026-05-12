const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');

const listarUsuarios = async (req, res, next) => {
  try {
    const { rol, activo } = req.query;
    const where = {};
    if (rol) where.rol = rol;
    if (activo !== undefined) where.activo = activo === 'true';

    const usuarios = await prisma.usuario.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
      select: {
        id: true, nombre: true, apellido: true,
        email: true, rol: true, esAdminDocente: true,
        activo: true, ultimoAcceso: true, creadoEn: true,
      },
    });

    return success(res, usuarios);
  } catch (err) {
    next(err);
  }
};

const obtenerUsuario = async (req, res, next) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, nombre: true, apellido: true,
        email: true, rol: true, activo: true,
        ultimoAcceso: true, creadoEn: true,
        perfil: true,
      },
    });

    if (!usuario) return error(res, 'Usuario no encontrado', 404);
    return success(res, usuario);
  } catch (err) {
    next(err);
  }
};

const actualizarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const datos = {};

    ['nombre', 'apellido'].forEach((campo) => {
      if (req.body[campo] !== undefined) datos[campo] = req.body[campo];
    });

    if (req.usuario.rol === 'admin' || req.usuario.esAdminDocente) {
      if (req.body.activo !== undefined) datos.activo = req.body.activo;
      if (req.body.rol !== undefined) datos.rol = req.body.rol;
      if (req.body.esAdminDocente !== undefined) datos.esAdminDocente = req.body.esAdminDocente;
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: datos,
      select: {
        id: true, nombre: true, apellido: true,
        email: true, rol: true, esAdminDocente: true, activo: true,
      },
    });

    return success(res, usuario, 'Usuario actualizado');
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Usuario no encontrado', 404);
    next(err);
  }
};

const cambiarPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password_actual, password_nueva } = req.body;

    if (req.usuario.rol !== 'admin' && req.usuario.id !== id) {
      return error(res, 'No autorizado', 403);
    }

    if (req.usuario.rol !== 'admin') {
      const usuario = await prisma.usuario.findUnique({ where: { id } });
      if (!usuario) return error(res, 'Usuario no encontrado', 404);
      const valida = await bcrypt.compare(password_actual, usuario.password);
      if (!valida) return error(res, 'Contraseña actual incorrecta', 400);
    }

    const hash = await bcrypt.hash(password_nueva, 12);
    await prisma.usuario.update({ where: { id }, data: { password: hash } });

    return success(res, null, 'Contraseña actualizada');
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Usuario no encontrado', 404);
    next(err);
  }
};

const crearUsuario = async (req, res, next) => {
  try {
    const { nombre, apellido, email, password, rol } = req.body;

    const existente = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
    if (existente) return error(res, 'El correo ya está registrado', 409);

    const hash = await bcrypt.hash(password, 12);
    const usuario = await prisma.usuario.create({
      data: { nombre, apellido, email: email.toLowerCase(), password: hash, rol },
      select: { id: true, nombre: true, apellido: true, email: true, rol: true, activo: true, creadoEn: true },
    });

    return success(res, usuario, 'Usuario creado exitosamente', 201);
  } catch (err) {
    next(err);
  }
};

const eliminarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.usuario.id === id) return error(res, 'No puedes eliminar tu propio usuario', 400);

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: { perfil: { select: { id: true } } },
    });
    if (!usuario) return error(res, 'Usuario no encontrado', 404);

    await prisma.$transaction(async (tx) => {
      // Desasociar al usuario de registros donde fue supervisor
      await tx.registroDiario.updateMany({
        where: { docenteSupervisorId: id },
        data: { docenteSupervisorId: null },
      });
      await tx.registroDiario.updateMany({
        where: { bacteriologoSupervisorId: id },
        data: { bacteriologoSupervisorId: null },
      });

      if (usuario.perfil) {
        // RegistroExamen se elimina en cascada al borrar RegistroDiario
        await tx.registroDiario.deleteMany({ where: { estudianteId: usuario.perfil.id } });
      }
      await tx.usuario.delete({ where: { id } });
    });

    return success(res, null, 'Usuario eliminado');
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Usuario no encontrado', 404);
    next(err);
  }
};

const entidadesDeUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const asociaciones = await prisma.entidadPersonal.findMany({
      where: { usuarioId: id },
      include: {
        entidad: {
          select: { id: true, nombre: true, ciudad: true, activo: true },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });
    return success(res, asociaciones.map((a) => a.entidad));
  } catch (err) {
    next(err);
  }
};

module.exports = { listarUsuarios, obtenerUsuario, actualizarUsuario, cambiarPassword, crearUsuario, entidadesDeUsuario, eliminarUsuario };
