const prisma = require('../config/prisma');
const { success } = require('../utils/response');

const sumEx = (registros) =>
  registros.reduce((s, r) => s + (r.examenes || []).reduce((ss, e) => ss + e.cantidad, 0), 0);

const obtener = async (req, res, next) => {
  try {
    const { id: usuarioId, rol, esAdminDocente } = req.usuario;
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    /* ─── ESTUDIANTE ─── */
    if (rol === 'estudiante') {
      const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId } });
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
          include: { examenes: true },
        }),
        prisma.registroDiario.findMany({
          where: { estudianteId: estudiante.id, fecha: { gte: inicioSemana } },
          include: { examenes: true },
        }),
        prisma.registroDiario.findMany({
          where: { estudianteId: estudiante.id, fecha: { gte: inicioMes } },
          include: { examenes: true },
        }),
        prisma.registroDiario.count({ where: { estudianteId: estudiante.id } }),
        prisma.registroDiario.findMany({
          where: { estudianteId: estudiante.id },
          orderBy: { fecha: 'desc' },
          take: 5,
          include: {
            examenes: {
              include: { examen: { select: { nombre: true, area: true } } },
            },
          },
        }),
      ]);

      return success(res, {
        examenesHoy: sumEx(regHoy ? [regHoy] : []),
        examenesSemana: sumEx(regsSemana),
        examenesMes: sumEx(regsMes),
        diasEnPractica,
        actividadReciente,
      });
    }

    /* ─── DOCENTE / BACTERIÓLOGO / ADMIN ─── */
    const esAdminEfectivo = rol === 'admin' || esAdminDocente;

    const whereEstudiante = esAdminEfectivo ? {}
      : rol === 'docente' ? { docenteSupervisorId: usuarioId }
      : { bacteriologoSupervisorId: usuarioId };

    const whereRegistro = esAdminEfectivo ? {} : { estudiante: whereEstudiante };

    const wherePendiente = esAdminEfectivo
      ? { firmado: false }
      : rol === 'docente'
      ? { firmado: false, firmaDocente: null, estudiante: whereEstudiante }
      : { firmado: false, firmaBacteriologo: null, estudiante: whereEstudiante };

    const [totalEstudiantes, pendientesFirma, firmadosMes, actividadReciente] = await Promise.all([
      prisma.estudiante.count({
        where: { ...whereEstudiante, usuario: { activo: true } },
      }),
      prisma.registroDiario.count({ where: wherePendiente }),
      prisma.registroDiario.count({
        where: { ...whereRegistro, firmado: true, fecha: { gte: inicioMes } },
      }),
      prisma.registroDiario.findMany({
        where: whereRegistro,
        orderBy: { fecha: 'desc' },
        take: 6,
        include: {
          estudiante: {
            include: { usuario: { select: { nombre: true, apellido: true } } },
          },
          examenes: true,
        },
      }),
    ]);

    return success(res, {
      totalEstudiantes,
      pendientesFirma,
      firmadosMes,
      actividadReciente,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { obtener };
