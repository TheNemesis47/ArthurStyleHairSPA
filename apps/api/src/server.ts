// Avvio dell'API. Uso: DATABASE_URL=… ORGANIZATION_SLUG=arthur-style node src/server.ts
import pg from 'pg';
import { findOrganizationId } from '@arthur/db';
import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';

const config = loadConfig();
const pool = new pg.Pool({ connectionString: config.DATABASE_URL, max: 20 });
// Un pool pg emette 'error' quando il server chiude una connessione inattiva: senza handler il processo cade.
pool.on('error', (err) => {
  console.error('pool PostgreSQL:', err.message);
});

const organizationId = await findOrganizationId(pool, config.ORGANIZATION_SLUG);
if (organizationId === undefined) throw new Error(`Organizzazione '${config.ORGANIZATION_SLUG}' inesistente`);

const app = await buildApp({
  pool,
  organizationId,
  clock: { now: () => Date.now() },
  publicOrigin: config.PUBLIC_API_ORIGIN,
  corsOrigins: config.CORS_ORIGINS,
  trustProxy: config.TRUST_PROXY,
  logLevel: config.LOG_LEVEL,
});

const shutdown = async () => {
  await app.close();
  await pool.end();
};
process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());

await app.listen({ host: config.HOST, port: config.PORT });
