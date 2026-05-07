const router = require('express').Router();
const { body } = require('express-validator');
const { listar, obtener, crear, actualizar, eliminar } = require('../controllers/entidadController');
const { listar: listarPersonal, agregar, eliminar: eliminarPersonal } = require('../controllers/entidadPersonalController');
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
router.delete('/:id', autorizar('admin', 'docente'), eliminar);

// Personal de la entidad (docentes y bacteriólogos asociados)
router.get('/:id/personal', listarPersonal);

router.post('/:id/personal',
  autorizar('admin', 'docente'),
  [body('usuarioId').notEmpty().withMessage('usuarioId requerido')],
  validar,
  agregar
);

router.delete('/:id/personal/:usuarioId', autorizar('admin', 'docente'), eliminarPersonal);

module.exports = router;
