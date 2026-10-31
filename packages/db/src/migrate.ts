// Esegue le migrazioni SQL in ordine, una transazione per file, con checksum anti-modifica.
// Uso: DATABASE_URL=postgresql://… node src/migrate.ts   (ruolo app_owner, docs/05 §5)
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations/', import.meta.url));

export async function migrate(client: pg.ClientBase, dir: string = MIGRATIONS_DIR): Promise<string[]> {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
  const applied = new Map(
    (
      await client.query<{ version: string; checksum: string }>(
        'SELECT version, checksum FROM schema_migrations',
      )
    ).rows.map((r) => [r.version, r.checksum]),
  );
  const files = (await readdir(dir)).filter((f) => /^\d{4}_[a-z0-9_]+\.sql$/.test(f)).sort();
  const done: string[] = [];
  for (const file of files) {
    const sql = await readFile(dir + file, 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const previous = applied.get(file);
    if (previous !== undefined) {
      if (previous !== checksum)
        throw new Error(`La migrazione ${file} è stata modificata dopo l'applicazione`);
      continue;
    }
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)', [
        file,
        checksum,
      ]);
      await client.query('COMMIT');
      done.push(file);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  }
  return done;
}

if (import.meta.url === `file://${process.argv[1] ?? ''}`) {
  const url = process.env['DATABASE_URL'];
  if (url === undefined || url === '') throw new Error('DATABASE_URL mancante');
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const done = await migrate(client);
    console.log(done.length === 0 ? 'Nessuna migrazione da applicare' : `Applicate: ${done.join(', ')}`);
  } finally {
    await client.end();
  }
}
