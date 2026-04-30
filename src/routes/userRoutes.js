const router = require('express').Router();
const { body } = require('express-validator');
const { listarUsuarios, obtenerUsuario, actualizarUsuario, cambiarPassword } = require('../controllers/userController');
const { autenticar, autorizar } = require('../middleware/auth');
const { validar } = require('../middleware/validate');

router.use(autenticar);

router.get('/', autorizar('admin', 'docente'), listarUsuarios);

router.get('/:id', obtenerUsuario);

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

module.exports = router;
