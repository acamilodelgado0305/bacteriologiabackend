const { User, Estudiante } = require('../models');
const { success, error } = require('../utils/response');

const listarUsuarios = async (req, res, next) => {
  try {
    const { rol, activo } = req.query;
    const where = {};
    if (rol) where.rol = rol;
    if (activo !== undefined) where.activo = activo === 'true';

    const usuarios = await User.findAll({
      where,
      order: [['created_at', 'DESC']],
    });

    return success(res, usuarios);
  } catch (err) {
    next(err);
  }
};

const obtenerUsuario = async (req, res, next) => {
  try {
    const usuario = await User.findByPk(req.params.id, {
      include: [{ model: Estudiante, as: 'perfil_estudiante' }],
    });

    if (!usuario) return error(res, 'Usuario no encontrado', 404);

    return success(res, usuario);
  } catch (err) {
    next(err);
  }
};

const actualizarUsuario = async (req, res, next) => {
  try {
    const usuario = await User.findByPk(req.params.id);
    if (!usuario) return error(res, 'Usuario no encontrado', 404);

    const camposPermitidos = ['nombre', 'apellido', 'activo'];
    if (req.usuario.rol === 'admin') camposPermitidos.push('rol');

    const datos = {};
    camposPermitidos.forEach((campo) => {
      if (req.body[campo] !== undefined) datos[campo] = req.body[campo];
    });

    await usuario.update(datos);
    return success(res, usuario.toJSON(), 'Usuario actualizado');
  } catch (err) {
    next(err);
  }
};

const cambiarPassword = async (req, res, next) => {
  try {
    const usuario = await User.findByPk(req.params.id);
    if (!usuario) return error(res, 'Usuario no encontrado', 404);

    if (req.usuario.rol !== 'admin' && req.usuario.id !== usuario.id) {
      return error(res, 'No autorizado', 403);
    }

    const { password_actual, password_nueva } = req.body;

    if (req.usuario.rol !== 'admin') {
      const valida = await usuario.verificarPassword(password_actual);
      if (!valida) return error(res, 'Contraseña actual incorrecta', 400);
    }

    await usuario.update({ password: password_nueva });
    return success(res, null, 'Contraseña actualizada');
  } catch (err) {
    next(err);
  }
};

module.exports = { listarUsuarios, obtenerUsuario, actualizarUsuario, cambiarPassword };
