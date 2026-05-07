const router = require('express').Router();
const { autenticar, autorizar } = require('../middleware/auth');
const { cerrar, listar, obtener } = require('../controllers/cierreController');

router.use(autenticar);

router.get('/', autorizar('admin', 'docente'), listar);
router.get('/:id', autorizar('admin', 'docente'), obtener);
router.post('/', autorizar('admin'), cerrar);

module.exports = router;
