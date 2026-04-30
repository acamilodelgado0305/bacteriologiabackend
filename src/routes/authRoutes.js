const router = require('express').Router();
const { body } = require('express-validator');
const { login, registro, refreshToken, perfil } = require('../controllers/authController');
const { autenticar } = require('../middleware/auth');
const { validar } = require('../middleware/validate');

router.post('/login',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida'),
  ],
  validar,
  login
);

router.post('/registro',
  [
    body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
    body('apellido').trim().notEmpty().withMessage('Apellido requerido'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 8 }).withMessage('Contraseña mínimo 8 caracteres'),
    body('rol').optional().isIn(['admin', 'estudiante', 'docente']).withMessage('Rol inválido'),
  ],
  validar,
  registro
);

router.post('/refresh', refreshToken);

router.get('/perfil', autenticar, perfil);

module.exports = router;
