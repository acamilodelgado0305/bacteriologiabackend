const { verificarToken } = require('../utils/jwt');
const prisma = require('../config/prisma');
const { error } = require('../utils/response');

const autenticar = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Token de acceso requerido', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verificarToken(token);
    const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });

    if (!usuario || !usuario.activo) {
      return error(res, 'Usuario no encontrado o inactivo', 401);
    }

    req.usuario = usuario;
    next();
  } catch {
    return error(res, 'Token inválido o expirado', 401);
  }
};

const autorizar = (...roles) => {
  return (req, res, next) => {
    const { rol, esAdminDocente } = req.usuario;
    // Un docente con esAdminDocente puede acceder a cualquier ruta que admita 'admin'
    if (roles.includes(rol) || (esAdminDocente && roles.includes('admin'))) {
      return next();
    }
    return error(res, 'No tienes permisos para esta acción', 403);
  };
};

module.exports = { autenticar, autorizar };
