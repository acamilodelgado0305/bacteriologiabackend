const { User } = require('../models');
const { generarToken, generarRefreshToken, verificarRefreshToken } = require('../utils/jwt');
const { success, error } = require('../utils/response');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const usuario = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!usuario || !usuario.activo) {
      return error(res, 'Credenciales incorrectas', 401);
    }

    const passwordValida = await usuario.verificarPassword(password);
    if (!passwordValida) {
      return error(res, 'Credenciales incorrectas', 401);
    }

    await usuario.update({ ultimo_acceso: new Date() });

    const payload = { id: usuario.id, email: usuario.email, rol: usuario.rol };
    const token = generarToken(payload);
    const refreshToken = generarRefreshToken(payload);

    return success(res, {
      token,
      refreshToken,
      usuario: usuario.toJSON(),
    }, 'Sesión iniciada correctamente');
  } catch (err) {
    next(err);
  }
};

const registro = async (req, res, next) => {
  try {
    const { nombre, apellido, email, password, rol } = req.body;

    const existente = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existente) {
      return error(res, 'El correo ya está registrado', 409);
    }

    const usuario = await User.create({
      nombre,
      apellido,
      email: email.toLowerCase(),
      password,
      rol: rol || 'estudiante',
    });

    const payload = { id: usuario.id, email: usuario.email, rol: usuario.rol };
    const token = generarToken(payload);
    const refreshToken = generarRefreshToken(payload);

    return success(res, { token, refreshToken, usuario: usuario.toJSON() }, 'Usuario creado exitosamente', 201);
  } catch (err) {
    next(err);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: rt } = req.body;
    if (!rt) return error(res, 'Refresh token requerido', 400);

    const decoded = verificarRefreshToken(rt);
    const usuario = await User.findByPk(decoded.id);

    if (!usuario || !usuario.activo) {
      return error(res, 'Usuario no válido', 401);
    }

    const payload = { id: usuario.id, email: usuario.email, rol: usuario.rol };
    const token = generarToken(payload);

    return success(res, { token }, 'Token renovado');
  } catch {
    return error(res, 'Refresh token inválido o expirado', 401);
  }
};

const perfil = async (req, res) => {
  return success(res, req.usuario.toJSON(), 'Perfil obtenido');
};

module.exports = { login, registro, refreshToken, perfil };
