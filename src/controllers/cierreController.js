const { randomUUID } = require('crypto');
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');
const { omitirFirmas, conPresenciaFirmas } = require('../utils/registroFirmas');

const cerrar = async (req, res, next) => {
  try {
    const { nombre, descripcion, conservar = {} } = req.body;
    const {
      docentes: conservarDocentes = true,
      supervisores: conservarSupervisores = true,
      estudiantesOpcion = 'todos',
      estudiantesIds = [],
      semestreDestino = null,
    } = conservar;

    if (!nombre?.trim()) return error(res, 'El nombre del cierre es requerido', 400);

    const totalActivos = await prisma.estudiante.count({ where: { cierreId: null } });
    if (totalActivos === 0) return error(res, 'No hay estudiantes activos para cerrar', 400);

    const totalRegistros = await prisma.registroDiario.count({ where: { cierreId: null } });

    // Determinar qué estudiantes se archivan (los NO conservados).
    // Los conservados quedan con cierreId: null → siguen visibles en su entidad.
    let whereArchivar = null;
    if (estudiantesOpcion === 'ninguno') {
      whereArchivar = { cierreId: null };
    } else if (estudiantesOpcion === 'noveno') {
      // conservar noveno → archivar decimo
      whereArchivar = { cierreId: null, semestre: 'decimo' };
    } else if (estudiantesOpcion === 'decimo') {
      // conservar decimo → archivar noveno
      whereArchivar = { cierreId: null, semestre: 'noveno' };
    } else if (estudiantesOpcion === 'manual') {
      whereArchivar = estudiantesIds.length > 0
        ? { cierreId: null, id: { notIn: estudiantesIds } }
        : { cierreId: null };
    }
    // 'todos': whereArchivar = null → ningún perfil de estudiante se archiva

    const totalEstudiantes = whereArchivar
      ? await prisma.estudiante.count({ where: whereArchivar })
      : 0;

    const resultado = await prisma.$transaction(async (tx) => {
      const nuevoCierre = await tx.cierreSemestre.create({
        data: {
          id: randomUUID(),
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
          totalEstudiantes,
          totalRegistros,
        },
      });

      // Archivar solo los perfiles NO conservados
      if (whereArchivar) {
        await tx.estudiante.updateMany({
          where: whereArchivar,
          data: { cierreId: nuevoCierre.id },
        });
      }

      // Archivar todos los registros diarios (pizarra limpia para el próximo semestre)
      await tx.registroDiario.updateMany({
        where: { cierreId: null },
        data: { cierreId: nuevoCierre.id },
      });

      // Actualizar semestre de los estudiantes que se conservan (cierreId sigue null)
      if (semestreDestino && estudiantesOpcion !== 'ninguno') {
        await tx.estudiante.updateMany({
          where: { cierreId: null },
          data: { semestre: semestreDestino },
        });
      }

      const desactivados = { docentes: 0, supervisores: 0, estudiantes: 0 };

      if (!conservarDocentes) {
        const r = await tx.usuario.updateMany({
          where: { rol: 'docente', activo: true },
          data: { activo: false },
        });
        desactivados.docentes = r.count;
      }

      if (!conservarSupervisores) {
        const r = await tx.usuario.updateMany({
          where: { rol: 'bacteriologo', activo: true },
          data: { activo: false },
        });
        desactivados.supervisores = r.count;
      }

      // Desactivar cuentas de los estudiantes archivados
      if (whereArchivar) {
        const archivados = await tx.estudiante.findMany({
          where: { cierreId: nuevoCierre.id },
          select: { usuarioId: true },
        });
        if (archivados.length > 0) {
          const r = await tx.usuario.updateMany({
            where: { id: { in: archivados.map((e) => e.usuarioId) }, activo: true },
            data: { activo: false },
          });
          desactivados.estudiantes = r.count;
        }
      }

      return { cierre: nuevoCierre, desactivados };
    });

    return success(res, resultado, `Semestre cerrado: ${totalRegistros} registros archivados`);
  } catch (err) {
    next(err);
  }
};

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

const obtener = async (req, res, next) => {
  try {
    const { id } = req.params;

    const cierre = await prisma.cierreSemestre.findUnique({ where: { id } });
    if (!cierre) return error(res, 'Cierre no encontrado', 404);

    const estudiantes = await prisma.estudiante.findMany({
      where: { cierreId: id },
      include: {
        usuario: { select: { nombre: true, apellido: true, email: true } },
        entidad: { select: { id: true, nombre: true, ciudad: true, departamento: true } },
        registros: {
          where: { cierreId: id },
          orderBy: { fecha: 'desc' },
          omit: omitirFirmas,
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

    // Extraer supervisores únicos de los registros
    const docentesMap = new Map();
    const bacteriologosMap = new Map();

    const estudiantesConTotales = estudiantes.map((est) => {
      est.registros.forEach((r) => {
        if (r.docenteSupervisor) {
          const d = r.docenteSupervisor;
          if (!docentesMap.has(d.id)) {
            docentesMap.set(d.id, { ...d, totalRegistros: 0, _ids: new Set() });
          }
          const entry = docentesMap.get(d.id);
          entry.totalRegistros++;
          entry._ids.add(est.id);
        }
        if (r.bacteriologoSupervisor) {
          const b = r.bacteriologoSupervisor;
          if (!bacteriologosMap.has(b.id)) {
            bacteriologosMap.set(b.id, { ...b, totalRegistros: 0, _ids: new Set() });
          }
          const entry = bacteriologosMap.get(b.id);
          entry.totalRegistros++;
          entry._ids.add(est.id);
        }
      });

      return {
        estudiante: est,
        registros: est.registros.map(conPresenciaFirmas),
        totalExamenes: est.registros.reduce(
          (sum, r) => sum + r.examenes.reduce((s, ex) => s + ex.cantidad, 0),
          0
        ),
      };
    });

    const docentes = [...docentesMap.values()].map(({ _ids, ...d }) => ({
      ...d, totalEstudiantes: _ids.size,
    }));
    const bacteriologos = [...bacteriologosMap.values()].map(({ _ids, ...b }) => ({
      ...b, totalEstudiantes: _ids.size,
    }));

    // Extraer entidades únicas de los estudiantes
    const entidadesMap = new Map();
    estudiantes.forEach((est) => {
      if (est.entidad?.id) {
        if (!entidadesMap.has(est.entidad.id)) {
          entidadesMap.set(est.entidad.id, { ...est.entidad, totalEstudiantes: 0, totalRegistros: 0 });
        }
        const ent = entidadesMap.get(est.entidad.id);
        ent.totalEstudiantes++;
        ent.totalRegistros += est.registros.length;
      }
    });

    return success(res, {
      cierre,
      estudiantes: estudiantesConTotales,
      supervisores: { docentes, bacteriologos },
      entidades: [...entidadesMap.values()].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    });
  } catch (err) {
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    const { id } = req.params;

    const cierre = await prisma.cierreSemestre.findUnique({ where: { id } });
    if (!cierre) return error(res, 'Cierre no encontrado', 404);

    await prisma.$transaction(async (tx) => {
      // Eliminar RegistroExamen de los registros del cierre
      const registros = await tx.registroDiario.findMany({
        where: { cierreId: id },
        select: { id: true },
      });
      if (registros.length > 0) {
        await tx.registroExamen.deleteMany({
          where: { registroId: { in: registros.map((r) => r.id) } },
        });
      }

      // Eliminar RegistroDiario
      await tx.registroDiario.deleteMany({ where: { cierreId: id } });

      // Obtener usuarioIds de los estudiantes archivados
      const estudiantesArchivados = await tx.estudiante.findMany({
        where: { cierreId: id },
        select: { usuarioId: true },
      });

      // Eliminar Estudiante
      await tx.estudiante.deleteMany({ where: { cierreId: id } });

      // Eliminar Usuario solo si no tiene otro Estudiante activo (re-matriculado)
      for (const { usuarioId } of estudiantesArchivados) {
        const otroEstudiante = await tx.estudiante.findFirst({ where: { usuarioId } });
        if (!otroEstudiante) {
          await tx.usuario.delete({ where: { id: usuarioId } });
        }
      }

      await tx.cierreSemestre.delete({ where: { id } });
    });

    return success(res, null, 'Cierre eliminado permanentemente');
  } catch (err) {
    next(err);
  }
};

module.exports = { cerrar, listar, obtener, eliminar };
