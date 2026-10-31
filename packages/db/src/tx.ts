import type pg from 'pg';

/**
 * Esegue fn in una transazione con l'organizzazione impostata (RLS, ADR-0009) e lock_timeout.
 * Ogni scrittura applicativa passa da qui: senza organizzazione il database rifiuta le query.
 */
export async function withOrgTx<T>(
  pool: pg.Pool,
  organizationId: string,
  fn: (c: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.org_id', $1, true)", [organizationId]);
    await client.query("SET LOCAL lock_timeout = '5s'");
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}

export async function lockKeys(client: pg.PoolClient, keys: readonly string[]): Promise<void> {
  for (const key of [...keys].sort())
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [key]);
}
