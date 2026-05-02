const router = require('express').Router();
const { body } = require('express-validator');
const {
  miPerfil, guardar, obtenerPorFecha, miHistorial,
  listar, firmar, pendientesFirma, misSupervisados,
} = require('../controllers/registroController');
const { autenticar, autorizar } = require('../middleware/auth');
const { validar } = require('../middleware/validate');

router.use(autenticar);

// Estudiante
router.get('/mi-perfil', autorizar('estudiante'), miPerfil);
router.get('/mi-historial', autorizar('estudiante'), miHistorial);
router.get('/por-fecha', autorizar('estudiante'), obtenerPorFecha);
router.post('/',
  autorizar('estudiante'),
  [body('fecha').isDate().withMessage('Fecha inválida')],
  validar,
  guardar
);

// Firma — estudiante, docente y bacteriologo
router.post('/:id/firmar',
  autorizar('estudiante', 'docente', 'bacteriologo'),
  [body('firma').notEmpty().withMessage('Firma requerida')],
  validar,
  firmar
);

// Pendientes de firma (docente / bacteriologo)
router.get('/pendientes', autorizar('docente', 'bacteriologo'), pendientesFirma);

// Todos los registros de los estudiantes supervisados
router.get('/mis-supervisados', autorizar('docente', 'bacteriologo'), misSupervisados);

// Admin / docente / bacteriologo — ver todos
router.get('/', autorizar('admin', 'docente', 'bacteriologo'), listar);

module.exports = router;
