const success = (res, data, mensaje = 'OK', status = 200) => {
  return res.status(status).json({ ok: true, mensaje, data });
};

const error = (res, mensaje = 'Error interno', status = 500, detalles = null) => {
  const body = { ok: false, mensaje };
  if (detalles) body.detalles = detalles;
  return res.status(status).json(body);
};

module.exports = { success, error };
