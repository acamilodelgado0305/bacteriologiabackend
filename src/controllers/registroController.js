const { randomUUID } = require('crypto');
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');

const supervisorSelect = { select: { id: true, nombre: true, apellido: true } };

// Perfil completo del estudiante actual (entidad + examenes disponibles + personal de la entidad)
const miPerfil = async (req, res, next) => {
  try {
    const estudiante = await prisma.estudiante.findUnique({
      where: { usuarioId: req.usuario.id },
      include: {
        entidad: {
          include: {
            examenes: {
              where: { activo: true },
              orderBy: [{ area: 'asc' }, { nombre: 'asc' }],
            },
            personal: {
              include: {
                usuario: {
                  select: { id: true, nombre: true, apellido: true, rol: true },
                },
              },
            },
          },
        },
      },
    });

    if (!estudiante) return error(res, 'Perfil de estudiante no encontrado', 404);
    return success(res, estudiante);
  } catch (err) {
    next(err);
  }
};

// Guardar (crear o actualizar) el registro de un día, con supervisores del día y firma del estudiante
const guardar = async (req, res, next) => {
  try {
    const {
      fecha, examenes = [], observaciones, firma, horaEntrada, horaSalida,
      docenteSupervisorId, bacteriologoSupervisorId,
    } = req.body;

    const estudiante = await prisma.estudiante.findUnique({
      where: { usuarioId: req.usuario.id },
      include: { entidad: true },
    });
    if (!estudiante) return error(res, 'Perfil de estudiante no encontrado', 404);
    if (!estudiante.entidadId) return error(res, 'No tienes una entidad asignada', 400);

    // Validar que el docente pertenece a la entidad (si se envía)
    if (docenteSupervisorId) {
      const asociacion = await prisma.entidadPersonal.findUnique({
        where: { entidadId_usuarioId: { entidadId: estudiante.entidadId, usuarioId: docenteSupervisorId } },
      });
      if (!asociacion) return error(res, 'El docente seleccionado no pertenece a esta entidad', 400);
    }

    // Validar que el bacteriólogo pertenece a la entidad (si se envía)
    if (bacteriologoSupervisorId) {
      const asociacion = await prisma.entidadPersonal.findUnique({
        where: { entidadId_usuarioId: { entidadId: estudiante.entidadId, usuarioId: bacteriologoSupervisorId } },
      });
      if (!asociacion) return error(res, 'El bacteriólogo seleccionado no pertenece a esta entidad', 400);
    }

    const fechaDate = new Date(fecha + 'T12:00:00Z');

    const resultado = await prisma.$transaction(async (tx) => {
      let registro = await tx.registroDiario.findFirst({
        where: { estudianteId: estudiante.id, fecha: fechaDate, cierreId: null },
      });

      if (registro?.firmado) {
        throw Object.assign(new Error('Este registro ya fue firmado y no puede modificarse'), { status: 400 });
      }
      if (registro?.firmaEstudiante) {
        throw Object.assign(new Error('Ya firmaste este registro. No puedes modificarlo.'), { status: 400 });
      }

      if (registro) {
        await tx.registroExamen.deleteMany({ where: { registroId: registro.id } });
        registro = await tx.registroDiario.update({
          where: { id: registro.id },
          data: {
            observaciones: observaciones || null,
            horaEntrada: horaEntrada || null,
            horaSalida: horaSalida || null,
            docenteSupervisorId: docenteSupervisorId || null,
            bacteriologoSupervisorId: bacteriologoSupervisorId || null,
          },
        });
      } else {
        registro = await tx.registroDiario.create({
          data: {
            id: randomUUID(),
            estudianteId: estudiante.id,
            fecha: fechaDate,
            horaEntrada: horaEntrada || null,
            horaSalida: horaSalida || null,
            observaciones: observaciones || null,
            docenteSupervisorId: docenteSupervisorId || null,
            bacteriologoSupervisorId: bacteriologoSupervisorId || null,
          },
        });
      }

      const examenesValidos = examenes.filter((e) => Number(e.cantidad) > 0);
      if (examenesValidos.length > 0) {
        await tx.registroExamen.createMany({
          data: examenesValidos.map((e) => ({
            id: randomUUID(),
            registroId: registro.id,
            examenId: e.examenId,
            cantidad: Number(e.cantidad),
          })),
        });
      }

      if (firma) {
        registro = await tx.registroDiario.update({
          where: { id: registro.id },
          data: { firmaEstudiante: firma, firmaEstudianteFecha: new Date() },
        });
      }

      return tx.registroDiario.findUnique({
        where: { id: registro.id },
        include: {
          docenteSupervisor: supervisorSelect,
          bacteriologoSupervisor: supervisorSelect,
          examenes: {
            include: { examen: { select: { id: true, nombre: true, area: true } } },
          },
        },
      });
    });

    return success(res, resultado, firma ? 'Registro guardado y firmado' : 'Registro guardado');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

// Obtener registro de una fecha específica del estudiante actual
const obtenerPorFecha = async (req, res, next) => {
  try {
    const { fecha } = req.query;
    if (!fecha) return error(res, 'Fecha requerida', 400);

    const estudiante = await prisma.estudiante.findUnique({
      where: { usuarioId: req.usuario.id },
    });
    if (!estudiante) return error(res, 'Perfil de estudiante no encontrado', 404);

    const fechaDate = new Date(fecha + 'T12:00:00Z');

    const registro = await prisma.registroDiario.findFirst({
      where: { estudianteId: estudiante.id, fecha: fechaDate, cierreId: null },
      include: {
        docenteSupervisor: supervisorSelect,
        bacteriologoSupervisor: supervisorSelect,
        examenes: {
          include: { examen: { select: { id: true, nombre: true, area: true } } },
        },
      },
    });

    return success(res, registro);
  } catch (err) {
    next(err);
  }
};

// Historial de registros del estudiante actual
const miHistorial = async (req, res, next) => {
  try {
    const estudiante = await prisma.estudiante.findUnique({
      where: { usuarioId: req.usuario.id },
    });
    if (!estudiante) return error(res, 'Perfil de estudiante no encontrado', 404);

    const registros = await prisma.registroDiario.findMany({
      where: { estudianteId: estudiante.id, cierreId: null },
      orderBy: { fecha: 'desc' },
      include: {
        docenteSupervisor: supervisorSelect,
        bacteriologoSupervisor: supervisorSelect,
        examenes: {
          include: { examen: { select: { nombre: true, area: true } } },
        },
      },
    });

    return success(res, registros);
  } catch (err) {
    next(err);
  }
};

// Listar todos los registros (admin/docente)
const listar = async (req, res, next) => {
  try {
    const { estudianteId, desde, hasta } = req.query;
    const where = { cierreId: null };
    if (estudianteId) where.estudianteId = estudianteId;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = new Date(desde + 'T00:00:00Z');
      if (hasta) where.fecha.lte = new Date(hasta + 'T23:59:59Z');
    }

    const registros = await prisma.registroDiario.findMany({
      where,
      orderBy: { fecha: 'desc' },
      include: {
        estudiante: {
          include: {
            usuario: { select: { nombre: true, apellido: true } },
            entidad: { select: { nombre: true } },
          },
        },
        docenteSupervisor: supervisorSelect,
        bacteriologoSupervisor: supervisorSelect,
        examenes: {
          include: { examen: { select: { nombre: true, area: true } } },
        },
      },
    });

    return success(res, registros);
  } catch (err) {
    next(err);
  }
};

const firmar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firma, nombreFirmante } = req.body;
    const { id: usuarioId, rol } = req.usuario;

    if (!firma) return error(res, 'La firma es requerida', 400);

    const registro = await prisma.registroDiario.findUnique({ where: { id } });
    if (!registro) return error(res, 'Registro no encontrado', 404);
    if (registro.firmado) return error(res, 'Este registro ya está completamente firmado', 400);

    const data = {};

    if (rol === 'estudiante') {
      const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId } });
      if (!estudiante || registro.estudianteId !== estudiante.id)
        return error(res, 'No autorizado para firmar este registro', 403);
      if (registro.firmaEstudiante) return error(res, 'Ya firmaste este registro', 400);
      data.firmaEstudiante = firma;
      data.firmaEstudianteFecha = new Date();

    } else if (rol === 'docente') {
      if (registro.docenteSupervisorId !== usuarioId)
        return error(res, 'No eres el docente supervisor asignado a este registro', 403);
      if (registro.firmaDocente) return error(res, 'El docente ya firmó este registro', 400);
      data.firmaDocente = firma;
      data.firmaDocenteFecha = new Date();

    } else if (rol === 'bacteriologo') {
      if (registro.bacteriologoSupervisorId !== usuarioId)
        return error(res, 'No eres el bacteriólogo supervisor asignado a este registro', 403);
      if (registro.firmaBacteriologo) return error(res, 'El bacteriólogo ya firmó este registro', 400);
      if (!nombreFirmante?.trim()) return error(res, 'El nombre del firmante es requerido', 400);
      data.firmaBacteriologo = firma;
      data.firmaBacteriologoFecha = new Date();
      data.nombreFirmanteBacteriologo = nombreFirmante.trim();

    } else {
      return error(res, 'No tienes permiso para firmar registros', 403);
    }

    let actualizado = await prisma.registroDiario.update({ where: { id }, data });

    // Si las 3 firmas están presentes → marcar como firmado
    if (actualizado.firmaEstudiante && actualizado.firmaDocente && actualizado.firmaBacteriologo) {
      actualizado = await prisma.registroDiario.update({ where: { id }, data: { firmado: true } });
    }

    return success(res, actualizado, 'Firma guardada exitosamente');
  } catch (err) {
    next(err);
  }
};

// Registros pendientes de firma para docente/bacteriologo
const pendientesFirma = async (req, res, next) => {
  try {
    const { id: usuarioId, rol } = req.usuario;
    const where = { firmado: false, cierreId: null };

    if (rol === 'docente') {
      where.firmaDocente = null;
      where.docenteSupervisorId = usuarioId;
    } else if (rol === 'bacteriologo') {
      where.firmaBacteriologo = null;
      where.bacteriologoSupervisorId = usuarioId;
    }

    const registros = await prisma.registroDiario.findMany({
      where,
      orderBy: { fecha: 'desc' },
      include: {
        estudiante: {
          include: {
            usuario: { select: { nombre: true, apellido: true } },
            entidad: { select: { nombre: true } },
          },
        },
        docenteSupervisor: supervisorSelect,
        bacteriologoSupervisor: supervisorSelect,
        examenes: {
          include: { examen: { select: { nombre: true, area: true } } },
        },
      },
    });

    return success(res, registros);
  } catch (err) {
    next(err);
  }
};

// Todos los registros asignados al supervisor (docente o bacteriologo) en este sistema
const misSupervisados = async (req, res, next) => {
  try {
    const { id: usuarioId, rol } = req.usuario;
    const where = { cierreId: null };

    if (rol === 'docente') {
      where.docenteSupervisorId = usuarioId;
    } else if (rol === 'bacteriologo') {
      where.bacteriologoSupervisorId = usuarioId;
    } else {
      return error(res, 'No autorizado', 403);
    }

    const registros = await prisma.registroDiario.findMany({
      where,
      orderBy: { fecha: 'desc' },
      include: {
        estudiante: {
          include: {
            usuario: { select: { nombre: true, apellido: true } },
            entidad: { select: { nombre: true } },
          },
        },
        docenteSupervisor: supervisorSelect,
        bacteriologoSupervisor: supervisorSelect,
        examenes: {
          include: { examen: { select: { nombre: true, area: true } } },
        },
      },
    });

    return success(res, registros);
  } catch (err) {
    next(err);
  }
};

module.exports = { miPerfil, guardar, obtenerPorFecha, miHistorial, listar, firmar, pendientesFirma, misSupervisados };
