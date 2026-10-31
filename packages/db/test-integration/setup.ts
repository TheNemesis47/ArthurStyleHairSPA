import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { migrate } from '../src/migrate.ts';

export interface TestDb {
  readonly admin: pg.Pool; // superutente, solo per preparare i dati
  readonly app: pg.Pool; // ruolo app_api: soggetto a RLS, come in produzione
  readonly name: string;
  drop(): Promise<void>;
}

/** Crea un database usa e getta, applica le migrazioni e il ruolo applicativo. Mai contro produzione. */
export async function createTestDb(): Promise<TestDb> {
  const url = process.env['DATABASE_URL'];
  if (url === undefined || url === '')
    throw new Error('DATABASE_URL mancante: i test di integrazione richiedono un PostgreSQL di test');
  const name = `arthur_it_${randomBytes(4).toString('hex')}`;
  const root = new pg.Client({ connectionString: url });
  await root.connect();
  await root.query(`CREATE DATABASE ${name}`); // nome generato qui, non input esterno
  const exists = await root.query("SELECT 1 FROM pg_roles WHERE rolname = 'app_api'");
  if (exists.rowCount === 0) await root.query("CREATE ROLE app_api LOGIN PASSWORD 'app_api_test'");
  await root.end();

  const dbUrl = withDatabase(url, name);
  const admin = new pg.Pool({ connectionString: dbUrl, max: 4 });
  // Un pool pg emette 'error' se il server chiude una connessione inattiva: va SEMPRE gestito (anche nell'API, con log)
  admin.on('error', () => undefined);
  const c = await admin.connect();
  try {
    const v = await c.query<{ v: string }>("SELECT current_setting('server_version_num') AS v");
    if (Number(v.rows[0]?.v) < 180000) {
      // Solo per i test su PG < 18: uuidv7() è nativo da PostgreSQL 18 (produzione e CI usano PG 18)
      await c.query('CREATE FUNCTION uuidv7() RETURNS uuid LANGUAGE sql AS $$ SELECT gen_random_uuid() $$');
    }
    await migrate(c);
  } finally {
    c.release();
  }
  const appUrl = new URL(dbUrl);
  appUrl.username = 'app_api';
  appUrl.password = 'app_api_test';
  const app = new pg.Pool({ connectionString: appUrl.toString(), max: 50 });
  app.on('error', () => undefined);
  return {
    admin,
    app,
    name,
    async drop() {
      await app.end();
      await admin.end();
      const r = new pg.Client({ connectionString: url });
      await r.connect();
      await r.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      await r.end();
    },
  };
}

function withDatabase(url: string, db: string): string {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
}
