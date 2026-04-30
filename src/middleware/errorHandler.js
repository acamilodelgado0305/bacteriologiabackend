const errorHandler = (err, req, res, next) => {
  console.error('💥 Error:', err);

  if (err.name === 'SequelizeValidationError') {
    const detalles = err.errors.map((e) => ({ campo: e.path, mensaje: e.message }));
    return res.status(400).json({ ok: false, mensaje: 'Error de validación', detalles });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ ok: false, mensaje: 'El registro ya existe' });
  }

  const status = err.status || 500;
  const mensaje = status === 500 ? 'Error interno del servidor' : err.message;
  return res.status(status).json({ ok: false, mensaje });
};

module.exports = errorHandler;
