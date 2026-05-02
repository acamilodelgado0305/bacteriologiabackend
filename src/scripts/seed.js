require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

const seed = async () => {
  try {
    const adminExiste = await prisma.usuario.findUnique({
      where: { email: 'admin@unipamplona.edu.co' },
    });

    if (!adminExiste) {
      const hash = await bcrypt.hash('Admin1234!', 12);
      await prisma.usuario.create({
        data: {
          nombre: 'Administrador',
          apellido: 'Sistema',
          email: 'admin@unipamplona.edu.co',
          password: hash,
          rol: 'admin',
        },
      });
      console.log('✅ Admin creado: admin@unipamplona.edu.co / Admin1234!');
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
