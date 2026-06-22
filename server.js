require('dotenv').config();
const app = require('./app');
const prisma = require('./src/config/prisma');

const PORT = process.env.PORT || 3001;

const iniciar = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Conexión a Supabase establecida');
    const server = app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    });

    // Cierre ordenado: libera las conexiones de Prisma antes de salir
    // (evita que cada reinicio de nodemon deje conexiones colgadas en Supabase)
    let cerrando = false;
    const apagar = async (senal) => {
      if (cerrando) return;
      cerrando = true;
      console.log(`\n🛑 Recibida señal ${senal}, cerrando...`);
      server.close();
      try { await prisma.$disconnect(); } catch { /* noop */ }
      process.exit(0);
    };

    // SIGUSR2 = reinicio de nodemon; SIGINT/SIGTERM = parada normal
    process.once('SIGUSR2', () => apagar('SIGUSR2'));
    process.once('SIGINT', () => apagar('SIGINT'));
    process.once('SIGTERM', () => apagar('SIGTERM'));
  } catch (err) {
    console.error('❌ Error al iniciar el servidor:', err.message);
    process.exit(1);
  }
};

iniciar();
