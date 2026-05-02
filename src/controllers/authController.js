const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { generarToken, generarRefreshToken, verificarRefreshToken } = require('../utils/jwt');
const { success, error } = require('../utils/response');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!usuario || !usuario.activo) {
      return error(res, 'Credenciales incorrectas', 401);
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return error(res, 'Credenciales incorrectas', 401);
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcceso: new Date() },
    });

    const payload = { id: usuario.id, email: usuario.email, rol: usuario.rol };
    const token = generarToken(payload);
    const refreshToken = generarRefreshToken(payload);

    const { password: _, ...usuarioSinPassword } = usuario;

    return success(res, { token, refreshToken, usuario: usuarioSinPassword }, 'Sesión iniciada correctamente');
  } catch (err) {
    next(err);
  }
};

const registro = async (req, res, next) => {
  try {
    const { nombre, apellido, email, password, rol } = req.body;

    const existente = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existente) {
      return error(res, 'El correo ya está registrado', 409);
    }

    const hash = await bcrypt.hash(password, 12);

    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        apellido,
        email: email.toLowerCase(),
        password: hash,
        rol: rol || 'estudiante',
      },
    });

    const payload = { id: usuario.id, email: usuario.email, rol: usuario.rol };
    const token = generarToken(payload);
    const refreshToken = generarRefreshToken(payload);

    const { password: _, ...usuarioSinPassword } = usuario;

    return success(res, { token, refreshToken, usuario: usuarioSinPassword }, 'Usuario creado exitosamente', 201);
  } catch (err) {
    next(err);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: rt } = req.body;
    if (!rt) return error(res, 'Refresh token requerido', 400);

    const decoded = verificarRefreshToken(rt);

    const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });
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
  const { password: _, ...usuarioSinPassword } = req.usuario;
  return success(res, usuarioSinPassword, 'Perfil obtenido');
};

module.exports = { login, registro, refreshToken, perfil };
