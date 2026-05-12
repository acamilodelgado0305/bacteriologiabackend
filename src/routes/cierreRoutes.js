const router = require('express').Router();
const { autenticar, autorizar } = require('../middleware/auth');
const { cerrar, listar, obtener, eliminar } = require('../controllers/cierreController');

router.use(autenticar);

router.get('/', autorizar('admin', 'docente'), listar);
router.get('/:id', autorizar('admin', 'docente'), obtener);
router.post('/', autorizar('admin'), cerrar);
router.delete('/:id', autorizar('admin'), eliminar);

module.exports = router;
