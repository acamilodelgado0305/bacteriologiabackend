require('dotenv').config();
const app = require('./app');
const prisma = require('./src/config/prisma');

const PORT = process.env.PORT || 3001;

const iniciar = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Conexión a Supabase establecida');
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('❌ Error al iniciar el servidor:', err.message);
    process.exit(1);
  }
};

iniciar();
