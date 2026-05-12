const router = require('express').Router();
const { body } = require('express-validator');
const { listarUsuarios, obtenerUsuario, actualizarUsuario, cambiarPassword, crearUsuario, entidadesDeUsuario, eliminarUsuario } = require('../controllers/userController');
const { autenticar, autorizar } = require('../middleware/auth');
const { validar } = require('../middleware/validate');

router.use(autenticar);

router.get('/', autorizar('admin', 'docente'), listarUsuarios);

router.post('/',
  autorizar('admin'),
  [
    body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
    body('apellido').trim().notEmpty().withMessage('Apellido requerido'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 8 }).withMessage('Mínimo 8 caracteres'),
    body('rol').isIn(['admin', 'docente', 'bacteriologo']).withMessage('Rol inválido'),
  ],
  validar,
  crearUsuario
);

router.get('/:id', obtenerUsuario);
router.get('/:id/entidades', autorizar('admin', 'docente'), entidadesDeUsuario);

router.put('/:id',
  [
    body('nombre').optional().trim().notEmpty(),
    body('apellido').optional().trim().notEmpty(),
  ],
  validar,
  actualizarUsuario
);

router.patch('/:id/password',
  [
    body('password_nueva').isLength({ min: 8 }).withMessage('Nueva contraseña mínimo 8 caracteres'),
  ],
  validar,
  cambiarPassword
);

router.delete('/:id', autorizar('admin'), eliminarUsuario);

module.exports = router;
