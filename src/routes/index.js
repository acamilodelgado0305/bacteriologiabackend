const router = require('express').Router();
const { autenticar } = require('../middleware/auth');
const { obtener } = require('../controllers/estadisticasController');

router.use('/auth', require('./authRoutes'));
router.use('/usuarios', require('./userRoutes'));
router.use('/entidades', require('./entidadRoutes'));
router.use('/entidades/:entidadId/examenes', require('./examenRoutes'));
router.use('/estudiantes', require('./estudianteRoutes'));
router.use('/registros', require('./registroRoutes'));

router.get('/estadisticas', autenticar, obtener);

module.exports = router;
