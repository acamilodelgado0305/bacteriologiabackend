const { PrismaClient } = require('@prisma/client');

// Para un servidor Node siempre activo usamos la conexión directa / session pooler
// (DIRECT_URL, puerto 5432). El pooler de transacciones (6543, pgbouncer) es para
// entornos serverless y aquí resultó lento/intermitente (causaba P2024).
// Se ajusta un límite de pool moderado para no agotar las conexiones de Supabase.
const construirUrl = () => {
  const base = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!base) return undefined;
  try {
    const url = new URL(base);
    if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '10');
    if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '20');
    return url.toString();
  } catch {
    return base;
  }
};

const prisma = new PrismaClient({
  datasources: { db: { url: construirUrl() } },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

module.exports = prisma;
