const prisma = require('../config/prisma');
const { success } = require('../utils/response');
const { omitirFirmas, conPresenciaFirmas } = require('../utils/registroFirmas');

const sumEx = (registros) =>
  registros.reduce((s, r) => s + (r.examenes || []).reduce((ss, e) => ss + e.cantidad, 0), 0);

const obtener = async (req, res, next) => {
  try {
    const { id: usuarioId, rol, esAdminDocente } = req.usuario;
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    /* ─── ESTUDIANTE ─── */
    if (rol === 'estudiante') {
      const estudiante = await prisma.estudiante.findFirst({
        where: { usuarioId, cierreId: null },
      });
      if (!estudiante) {
        return success(res, { examenesHoy: 0, examenesSemana: 0, examenesMes: 0, diasEnPractica: 0, actividadReciente: [] });
      }

      const fechaHoy = new Date(ahora.toISOString().split('T')[0] + 'T12:00:00Z');
      const diaSemana = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1;
      const inicioSemana = new Date(ahora);
      inicioSemana.setDate(ahora.getDate() - diaSemana);
      inicioSemana.setHours(0, 0, 0, 0);

      const [regHoy, regsSemana, regsMes, diasEnPractica, actividadReciente] = await Promise.all([
        prisma.registroDiario.findUnique({
          where: { estudianteId_fecha: { estudianteId: estudiante.id, fecha: fechaHoy } },
          omit: omitirFirmas,
          include: { examenes: true },
        }),
        prisma.registroDiario.findMany({
          where: { estudianteId: estudiante.id, fecha: { gte: inicioSemana } },
          omit: omitirFirmas,
          include: { examenes: true },
        }),
        prisma.registroDiario.findMany({
          where: { estudianteId: estudiante.id, fecha: { gte: inicioMes } },
          omit: omitirFirmas,
          include: { examenes: true },
        }),
        prisma.registroDiario.count({ where: { estudianteId: estudiante.id } }),
        prisma.registroDiario.findMany({
          where: { estudianteId: estudiante.id },
          orderBy: { fecha: 'desc' },
          take: 5,
          omit: omitirFirmas,
          include: {
            examenes: { include: { examen: { select: { nombre: true, area: true } } } },
          },
        }),
      ]);

      return success(res, {
        examenesHoy: sumEx(regHoy ? [regHoy] : []),
        examenesSemana: sumEx(regsSemana),
        examenesMes: sumEx(regsMes),
        diasEnPractica,
        actividadReciente: actividadReciente.map(conPresenciaFirmas),
      });
    }

    const includeActividad = {
      estudiante: {
        include: { usuario: { select: { nombre: true, apellido: true } } },
      },
      examenes: true,
    };

    /* ─── ADMIN ─── */
    if (rol === 'admin' || esAdminDocente) {
      const [totalEstudiantes, totalUsuarios, pendientesFirma, firmadosMes, actividadReciente] = await Promise.all([
        prisma.estudiante.count({ where: { cierreId: null } }),
        prisma.usuario.count({ where: { activo: true } }),
        prisma.registroDiario.count({ where: { firmado: false, cierreId: null } }),
        prisma.registroDiario.count({ where: { firmado: true, fecha: { gte: inicioMes }, cierreId: null } }),
        prisma.registroDiario.findMany({
          where: { cierreId: null },
          orderBy: { fecha: 'desc' },
          take: 6,
          omit: omitirFirmas,
          include: includeActividad,
        }),
      ]);

      return success(res, { totalEstudiantes, totalUsuarios, pendientesFirma, firmadosMes, actividadReciente: actividadReciente.map(conPresenciaFirmas) });
    }

    /* ─── DOCENTE ─── */
    if (rol === 'docente') {
      const whereReg = { docenteSupervisorId: usuarioId, cierreId: null };

      const [estudiantesUnicos, pendientesFirma, firmadosMes, actividadReciente] = await Promise.all([
        prisma.registroDiario.groupBy({
          by: ['estudianteId'],
          where: whereReg,
        }).then((r) => r.length),
        prisma.registroDiario.count({
          where: { ...whereReg, firmaDocente: null, firmado: false },
        }),
        prisma.registroDiario.count({
          where: { ...whereReg, firmado: true, fecha: { gte: inicioMes } },
        }),
        prisma.registroDiario.findMany({
          where: whereReg,
          orderBy: { fecha: 'desc' },
          take: 6,
          omit: omitirFirmas,
          include: includeActividad,
        }),
      ]);

      return success(res, {
        totalEstudiantes: estudiantesUnicos,
        pendientesFirma,
        firmadosMes,
        actividadReciente: actividadReciente.map(conPresenciaFirmas),
      });
    }

    /* ─── BACTERIÓLOGO ─── */
    if (rol === 'bacteriologo') {
      const whereReg = { bacteriologoSupervisorId: usuarioId, cierreId: null };

      const [estudiantesUnicos, pendientesFirma, firmadosMes, actividadReciente] = await Promise.all([
        prisma.registroDiario.groupBy({
          by: ['estudianteId'],
          where: whereReg,
        }).then((r) => r.length),
        prisma.registroDiario.count({
          where: { ...whereReg, firmaBacteriologo: null, firmado: false },
        }),
        prisma.registroDiario.count({
          where: { ...whereReg, firmado: true, fecha: { gte: inicioMes } },
        }),
        prisma.registroDiario.findMany({
          where: whereReg,
          orderBy: { fecha: 'desc' },
          take: 6,
          omit: omitirFirmas,
          include: includeActividad,
        }),
      ]);

      return success(res, {
        totalEstudiantes: estudiantesUnicos,
        pendientesFirma,
        firmadosMes,
        actividadReciente: actividadReciente.map(conPresenciaFirmas),
      });
    }

    return success(res, {});
  } catch (err) {
    next(err);
  }
};

module.exports = { obtener };
