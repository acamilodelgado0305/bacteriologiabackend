const router = require('express').Router();
const { body } = require('express-validator');
const { listar, obtener, crear, actualizar } = require('../controllers/entidadController');
const { autenticar, autorizar } = require('../middleware/auth');
const { validar } = require('../middleware/validate');

router.use(autenticar);

router.get('/', listar);
router.get('/:id', obtener);

router.post('/',
  autorizar('admin', 'docente'),
  [body('nombre').trim().notEmpty().withMessage('Nombre requerido')],
  validar,
  crear
);

router.put('/:id', autorizar('admin', 'docente'), actualizar);

module.exports = router;
