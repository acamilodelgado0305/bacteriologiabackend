const router = require('express').Router({ mergeParams: true });
const { body } = require('express-validator');
const { listarPorEntidad, crear, actualizar, importar, eliminar } = require('../controllers/examenController');
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
router.delete('/:examenId', autorizar('admin', 'docente'), eliminar);

router.post('/importar',
  autorizar('admin', 'docente'),
  [body('origenId').notEmpty().withMessage('origenId requerido')],
  validar,
  importar
);

module.exports = router;
