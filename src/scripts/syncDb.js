require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../config/database');
require('../models');

const sync = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión establecida');
    await sequelize.sync({ alter: true });
    console.log('✅ Tablas sincronizadas con la base de datos');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error al sincronizar:', err.message);
    process.exit(1);
  }
};

sync();
