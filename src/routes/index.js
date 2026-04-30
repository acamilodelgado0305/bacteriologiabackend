const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/usuarios', require('./userRoutes'));

// Rutas futuras (se agregarán en siguientes sprints)
// router.use('/registros', require('./registroRoutes'));
// router.use('/reportes', require('./reporteRoutes'));
// router.use('/firmas', require('./firmaRoutes'));

module.exports = router;
