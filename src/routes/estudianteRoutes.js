const router = require('express').Router();
const { body } = require('express-validator');
const { listar, obtener, crear, actualizar, eliminar } = require('../controllers/estudianteController');
const { autenticar, autorizar } = require('../middleware/auth');
const { validar } = require('../middleware/validate');

router.use(autenticar);

router.get('/', autorizar('admin', 'docente'), listar);
router.get('/:id', obtener);

router.post('/',
  autorizar('admin', 'docente'),
  [
    body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
    body('apellido').trim().notEmpty().withMessage('Apellido requerido'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 8 }).withMessage('Contraseña mínimo 8 caracteres'),
    body('numeroDocumento').trim().notEmpty().withMessage('Número de documento requerido'),
    body('semestre').isIn(['noveno', 'decimo']).withMessage('Semestre debe ser noveno o decimo'),
  ],
  validar,
  crear
);

router.put('/:id', autorizar('admin', 'docente'), actualizar);
router.delete('/:id', autorizar('admin'), eliminar);

module.exports = router;
