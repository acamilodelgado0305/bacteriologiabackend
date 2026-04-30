const { validationResult } = require('express-validator');
const { error } = require('../utils/response');

const validar = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return error(res, 'Datos inválidos', 400, errores.array());
  }
  next();
};

module.exports = { validar };
