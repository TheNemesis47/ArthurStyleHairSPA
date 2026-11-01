import type pg from 'pg';
import { lockKeys, withOrgTx } from './tx.ts';

/**
 * Verifica del contatto con OTP via email (docs/12 §5, docs/07 §3): 6 cifre, 10 minuti, max 5 tentativi.
 * In DB solo l'HMAC del codice (calcolato dall'API con un segreto) e lo SHA-256 del token di verifica.
 */

export interface IssueVerificationInput {
  readonly organizationId: string;
  /** Generato dall'API: entra nell'HMAC del codice, così lo stesso codice non vale per un'altra richiesta. */
  readonly id: string;
  readonly destination: string;
  readonly codeHash: Buffer;
  readonly ipHash: Buffer | null;
  readonly now: Date;
  readonly expiresAt: Date;
  /** Tetti per destinatario (anti-abuso e costo, docs/12 §5). */
  readonly limits: { readonly perWindow: number; readonly windowMin: number; readonly perDay: number };
}

/**
 * Registra un nuovo codice e annulla i precedenti dello stesso indirizzo.
 * 'throttled' se l'indirizzo ha già ricevuto troppi codici: l'API risponde comunque in modo generico.
 */
export async function issueContactVerification(
  pool: pg.Pool,
  input: IssueVerificationInput,
): Promise<'issued' | 'throttled'> {
  const destination = input.destination.toLowerCase();
  return withOrgTx(pool, input.organizationId, async (c) => {
    // Serializza le richieste per lo stesso indirizzo: il conteggio dei limiti non ha corse.
    await lockKeys(c, [`otp:${input.organizationId}:${destination}`]);
    const counts = await c.query<{ in_window: number; in_day: number }>(
      `SELECT count(*) FILTER (WHERE created_at > $2::timestamptz - make_interval(mins => $3))::int AS in_window,
              count(*) FILTER (WHERE created_at > $2::timestamptz - interval '1 day')::int AS in_day
         FROM contact_verifications WHERE destination = $1`,
      [destination, input.now, input.limits.windowMin],
    );
    const n = counts.rows[0] ?? { in_window: 0, in_day: 0 };
    if (n.in_window >= input.limits.perWindow || n.in_day >= input.limits.perDay) return 'throttled';

    await c.query(
      `UPDATE contact_verifications SET superseded_at = $2
        WHERE destination = $1 AND superseded_at IS NULL AND verified_at IS NULL`,
      [destination, input.now],
    );
    await c.query(
      `INSERT INTO contact_verifications (id, organization_id, destination, code_hash, expires_at, ip_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [input.id, input.organizationId, destination, input.codeHash, input.expiresAt, input.ipHash, input.now],
    );
    return 'issued';
  });
}

export interface VerifyCodeInput {
  readonly organizationId: string;
  readonly destination: string;
  readonly now: Date;
  readonly maxAttempts: number;
  /** Confronto a tempo costante fatto dall'API: il segreto dell'HMAC non entra nel database. */
  readonly matches: (verificationId: string, codeHash: Buffer) => boolean;
  /** Token monouso consegnato al client se il codice è giusto (solo l'hash va in DB). */
  readonly tokenHash: Buffer;
  readonly tokenExpiresAt: Date;
}

/**
 * Controlla il codice più recente dell'indirizzo. Un codice sbagliato consuma un tentativo; al limite il codice
 * è bloccato ('locked') e ne serve uno nuovo. "Nessun codice" e "codice sbagliato" rispondono uguale ('invalid').
 */
export async function verifyContactCode(
  pool: pg.Pool,
  input: VerifyCodeInput,
): Promise<'verified' | 'invalid' | 'locked'> {
  const destination = input.destination.toLowerCase();
  return withOrgTx(pool, input.organizationId, async (c) => {
    const r = await c.query<{ id: string; code_hash: Buffer; attempts: number }>(
      `SELECT id, code_hash, attempts FROM contact_verifications
        WHERE destination = $1 AND superseded_at IS NULL AND verified_at IS NULL AND expires_at > $2
        ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [destination, input.now],
    );
    const v = r.rows[0];
    if (v === undefined) return 'invalid';
    if (v.attempts >= input.maxAttempts) return 'locked';
    if (!input.matches(v.id, v.code_hash)) {
      await c.query('UPDATE contact_verifications SET attempts = attempts + 1 WHERE id = $1', [v.id]);
      return v.attempts + 1 >= input.maxAttempts ? 'locked' : 'invalid';
    }
    await c.query(
      `UPDATE contact_verifications SET verified_at = $2, token_hash = $3, token_expires_at = $4, attempts = attempts + 1
        WHERE id = $1`,
      [v.id, input.now, input.tokenHash, input.tokenExpiresAt],
    );
    return 'verified';
  });
}

/**
 * Consuma il token di verifica DENTRO la transazione della conferma: se la conferma fallisce (slot, limiti),
 * il ROLLBACK lascia il token valido e il cliente può riprovare senza un nuovo codice.
 */
export async function consumeVerificationToken(
  c: pg.PoolClient,
  input: { tokenHash: Buffer; destination: string; now: Date },
): Promise<boolean> {
  const r = await c.query(
    `UPDATE contact_verifications SET consumed_at = $3
      WHERE token_hash = $1 AND destination = $2 AND consumed_at IS NULL AND token_expires_at > $3`,
    [input.tokenHash, input.destination.toLowerCase(), input.now],
  );
  return r.rowCount === 1;
}
