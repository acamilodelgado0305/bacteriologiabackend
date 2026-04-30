require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../config/database');
const { User } = require('../models');

const seed = async () => {
  try {
    await sequelize.authenticate();

    const adminExiste = await User.findOne({ where: { email: 'admin@unipamplona.edu.co' } });
    if (!adminExiste) {
      await User.create({
        nombre: 'Administrador',
        apellido: 'Sistema',
        email: 'admin@unipamplona.edu.co',
        password: 'Admin1234!',
        rol: 'admin',
      });
      console.log('✅ Usuario admin creado: admin@unipamplona.edu.co / Admin1234!');
    } else {
      console.log('ℹ️  Admin ya existe');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error en seed:', err.message);
    process.exit(1);
  }
};

seed();
