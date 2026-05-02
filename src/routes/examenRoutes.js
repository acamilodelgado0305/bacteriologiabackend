const router = require('express').Router({ mergeParams: true });
const { body } = require('express-validator');
const { listarPorEntidad, crear, actualizar } = require('../controllers/examenController');
const { autenticar, autorizar } = require('../middleware/auth');
const { validar } = require('../middleware/validate');

router.use(autenticar);

router.get('/', listarPorEntidad);

router.post('/',
  autorizar('admin', 'docente'),
  [body('nombre').trim().notEmpty().withMessage('Nombre del examen requerido')],
  validar,
  crear
);

router.put('/:examenId', autorizar('admin', 'docente'), actualizar);

module.exports = router;
