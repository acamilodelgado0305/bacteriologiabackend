const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');

const supervisorSelect = { select: { id: true, nombre: true, apellido: true } };

const listar = async (req, res, next) => {
  try {
    const { entidadId, semestre } = req.query;
    const where = {};
    if (entidadId) where.entidadId = entidadId;
    if (semestre) where.semestre = semestre;

    const estudiantes = await prisma.estudiante.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
      include: {
        usuario: {
          select: { id: true, nombre: true, apellido: true, email: true, activo: true },
        },
        entidad: { select: { id: true, nombre: true, ciudad: true } },
        docenteSupervisor: supervisorSelect,
        bacteriologoSupervisor: supervisorSelect,
      },
    });
    return success(res, estudiantes);
  } catch (err) {
    next(err);
  }
};

const obtener = async (req, res, next) => {
  try {
    const estudiante = await prisma.estudiante.findUnique({
      where: { id: req.params.id },
      include: {
        usuario: { select: { id: true, nombre: true, apellido: true, email: true, activo: true } },
        entidad: true,
        docenteSupervisor: { select: { id: true, nombre: true, apellido: true, email: true } },
        bacteriologoSupervisor: { select: { id: true, nombre: true, apellido: true, email: true } },
      },
    });
    if (!estudiante) return error(res, 'Estudiante no encontrado', 404);
    return success(res, estudiante);
  } catch (err) {
    next(err);
  }
};

const crear = async (req, res, next) => {
  try {
    const {
      nombre, apellido, email, password,
      numeroDocumento, semestre,
      entidadId, docenteSupervisorId, bacteriologoSupervisorId,
      fechaInicio, fechaFin,
    } = req.body;

    const emailExiste = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (emailExiste) return error(res, 'El correo ya está registrado', 409);

    const docExiste = await prisma.estudiante.findUnique({
      where: { numeroDocumento },
    });
    if (docExiste) return error(res, 'El número de documento ya está registrado', 409);

    const hash = await bcrypt.hash(password, 12);

    const resultado = await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          nombre,
          apellido,
          email: email.toLowerCase(),
          password: hash,
          rol: 'estudiante',
        },
      });

      const estudiante = await tx.estudiante.create({
        data: {
          usuarioId: usuario.id,
          numeroDocumento,
          semestre,
          entidadId: entidadId || null,
          docenteSupervisorId: docenteSupervisorId || null,
          bacteriologoSupervisorId: bacteriologoSupervisorId || null,
          fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
          fechaFin: fechaFin ? new Date(fechaFin) : null,
        },
        include: {
          usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
          entidad: { select: { id: true, nombre: true } },
          docenteSupervisor: supervisorSelect,
          bacteriologoSupervisor: supervisorSelect,
        },
      });

      return estudiante;
    });

    return success(res, resultado, 'Estudiante creado exitosamente', 201);
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      semestre, entidadId, docenteSupervisorId, bacteriologoSupervisorId,
      fechaInicio, fechaFin, activo, nombre, apellido,
    } = req.body;

    await prisma.$transaction(async (tx) => {
      const estudiante = await tx.estudiante.findUnique({ where: { id } });
      if (!estudiante) throw Object.assign(new Error('Estudiante no encontrado'), { status: 404 });

      const dataEstudiante = {};
      if (semestre) dataEstudiante.semestre = semestre;
      if (entidadId !== undefined) dataEstudiante.entidadId = entidadId || null;
      if (docenteSupervisorId !== undefined) dataEstudiante.docenteSupervisorId = docenteSupervisorId || null;
      if (bacteriologoSupervisorId !== undefined) dataEstudiante.bacteriologoSupervisorId = bacteriologoSupervisorId || null;
      if (fechaInicio !== undefined) dataEstudiante.fechaInicio = fechaInicio ? new Date(fechaInicio) : null;
      if (fechaFin !== undefined) dataEstudiante.fechaFin = fechaFin ? new Date(fechaFin) : null;

      if (Object.keys(dataEstudiante).length > 0) {
        await tx.estudiante.update({ where: { id }, data: dataEstudiante });
      }

      const dataUsuario = {};
      if (nombre) dataUsuario.nombre = nombre;
      if (apellido) dataUsuario.apellido = apellido;
      if (activo !== undefined) dataUsuario.activo = activo;

      if (Object.keys(dataUsuario).length > 0) {
        await tx.usuario.update({ where: { id: estudiante.usuarioId }, data: dataUsuario });
      }
    });

    const actualizado = await prisma.estudiante.findUnique({
      where: { id },
      include: {
        usuario: { select: { id: true, nombre: true, apellido: true, email: true, activo: true } },
        entidad: { select: { id: true, nombre: true } },
        docenteSupervisor: supervisorSelect,
        bacteriologoSupervisor: supervisorSelect,
      },
    });

    return success(res, actualizado, 'Estudiante actualizado');
  } catch (err) {
    if (err.status === 404) return error(res, err.message, 404);
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const estudiante = await prisma.estudiante.findUnique({ where: { id } });
    if (!estudiante) return error(res, 'Estudiante no encontrado', 404);

    await prisma.usuario.update({
      where: { id: estudiante.usuarioId },
      data: { activo: false },
    });

    return success(res, null, 'Estudiante desactivado exitosamente');
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, obtener, crear, actualizar, eliminar };
