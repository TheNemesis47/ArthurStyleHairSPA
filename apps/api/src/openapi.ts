// Genera il contratto OpenAPI 3.1 dalle rotte e dagli schemi zod (docs/07 §1, contract-first).
// Uso: pnpm --filter @arthur/api openapi  → packages/contracts/openapi.json (versionato; un test verifica che sia aggiornato)
import { writeFile } from 'node:fs/promises';
import pg from 'pg';
import { buildApp } from './app.ts';

export const OPENAPI_PATH = new URL('../../../packages/contracts/openapi.json', import.meta.url);

/** Documento OpenAPI in JSON stabile (chiavi nell'ordine di generazione, indentazione 2, newline finale). */
export async function generateOpenApi(): Promise<string> {
  // Il pool non si connette mai: per generare il documento basta registrare le rotte.
  const pool = new pg.Pool({ connectionString: 'postgresql://unused@127.0.0.1:1/unused' });
  const app = await buildApp({
    pool,
    organizationId: '00000000-0000-0000-0000-000000000000',
    clock: { now: () => 0 },
    publicOrigin: 'https://api.example.invalid',
    // Solo per registrare le rotte: nessuna richiesta viene servita.
    secrets: { holdCookie: 'x'.repeat(32), otp: 'y'.repeat(32) },
    human: { verify: () => Promise.resolve(false) },
    mailer: { send: () => Promise.reject(new Error('non usato')) },
  });
  await app.ready();
  const doc = app.swagger();
  await app.close();
  await pool.end();
  return `${JSON.stringify(doc, null, 2)}\n`;
}

if (import.meta.url === `file://${process.argv[1] ?? ''}`) {
  await writeFile(OPENAPI_PATH, await generateOpenApi());
  console.log(`Scritto ${OPENAPI_PATH.pathname}`);
}
