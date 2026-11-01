import type pg from 'pg';
import type { Slot } from '@arthur/core';
import { advisoryLockKeys } from './lock-keys.ts';
import { PG, pgCode, pgConstraint } from './errors.ts';
import { withOrgTx } from './tx.ts';

export interface HoldItem {
  readonly serviceId: string;
  readonly priceCents: number;
  /** Fotografia del servizio al momento della prenotazione (nome, prezzo, fasi): lo storico non cambia. */
  readonly snapshot: Readonly<Record<string, unknown>>;
}

export interface CreateHoldInput {
  readonly organizationId: string;
  readonly locationId: string;
  readonly timezone: string;
  readonly slot: Slot;
  /** Uno per servizio, nello stesso ordine di AvailabilityInput.services. */
  readonly items: readonly HoldItem[];
  readonly currency: string;
  readonly source: 'web' | 'app' | 'admin' | 'phone' | 'walk_in' | 'mcp' | 'import';
  /** Orologio del server (porta Clock): decide quali hold sono già scaduti. */
  readonly now: Date;
  readonly expiresAt: Date;
  /** Sessione (cookie/dispositivo). Se presente, il nuovo hold SOSTITUISCE quelli attivi della stessa sessione. */
  readonly sessionHash: Buffer | null;
  readonly idempotencyKey: string | null;
  readonly createdByActor: Readonly<Record<string, unknown>>;
}

export type CreateHoldResult =
  | { readonly ok: true; readonly bookingId: string }
  /** duplicate-key: la Idempotency-Key esiste già per la sede (richiesta ripetuta o concorrente). */
  | { readonly ok: false; readonly reason: 'slot-taken' | 'busy' | 'duplicate-key' };

const IDEMPOTENCY_CONSTRAINT = 'bookings_location_id_idempotency_key_key';
const UNIQUE_VIOLATION = '23505';

/**
 * Crea un hold (prenotazione provvisoria) e le sue allocazioni in un'unica transazione (docs/06 §4).
 * - lock advisory: prima la sessione, poi (risorsa, giorno) in ordine → contesa ordinata, niente deadlock;
 * - gli hold SCADUTI ma non ancora ripuliti dal worker sulle stesse risorse passano a 'expired' (docs/06 §4);
 * - max 1 hold attivo per sessione (docs/06 E10): quelli precedenti della sessione passano a 'cancelled';
 * - il vincolo EXCLUDE decide: 23P01 → 'slot-taken' (l'API risponde 409 con alternative);
 * - 40P01/55P03 → un solo nuovo tentativo, poi 'busy' (503). MAI un errore non gestito.
 */
export async function createHold(pool: pg.Pool, input: CreateHoldInput): Promise<CreateHoldResult> {
  if (input.items.length === 0) throw new RangeError('Serve almeno un servizio');
  const resourceKeys = advisoryLockKeys(input.slot.assignments, input.timezone);
  const keys =
    input.sessionHash === null
      ? resourceKeys
      : [`session:${input.sessionHash.toString('hex')}`, ...resourceKeys];
  const total = input.items.reduce((s, i) => s + i.priceCents, 0);
  const resources = [...new Set(input.slot.assignments.map((a) => a.resourceId))];
  const spanStart = Math.min(...input.slot.assignments.map((a) => a.interval.start));
  const spanEnd = Math.max(...input.slot.assignments.map((a) => a.interval.end));

  for (let attempt = 0; ; attempt++) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.org_id', $1, true)", [input.organizationId]);
      await client.query("SET LOCAL lock_timeout = '5s'");
      for (const key of keys)
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [key]);

      await client.query(
        `UPDATE bookings SET status = 'expired', version = version + 1, updated_at = now()
          WHERE status = 'held' AND hold_expires_at <= $1
            AND id IN (SELECT booking_id FROM allocations
                        WHERE active AND resource_id = ANY($2::uuid[]) AND during && tstzrange($3, $4, '[)'))`,
        [input.now, resources, new Date(spanStart), new Date(spanEnd)],
      );
      if (input.sessionHash !== null)
        await client.query(
          `UPDATE bookings SET status = 'cancelled', cancelled_at = $2, cancelled_by = 'customer',
                  cancel_reason = 'replaced', version = version + 1, updated_at = now()
            WHERE status = 'held' AND hold_session_hash = $1`,
          [input.sessionHash, input.now],
        );

      const booking = await client.query<{ id: string }>(
        `INSERT INTO bookings (organization_id, location_id, status, source, period, hold_expires_at, hold_session_hash,
                               total_price_cents, currency, idempotency_key, created_by_actor)
         VALUES ($1, $2, 'held', $3, tstzrange($4, $5, '[)'), $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          input.organizationId,
          input.locationId,
          input.source,
          new Date(input.slot.customerStart).toISOString(),
          new Date(input.slot.customerEnd).toISOString(),
          input.expiresAt.toISOString(),
          input.sessionHash,
          total,
          input.currency,
          input.idempotencyKey,
          JSON.stringify(input.createdByActor),
        ],
      );
      const bookingId = booking.rows[0]?.id;
      if (bookingId === undefined) throw new Error('INSERT bookings senza id');

      const itemIds: string[] = [];
      for (const [position, item] of input.items.entries()) {
        const staffAssignment = input.slot.assignments.find(
          (a) => a.serviceIndex === position && a.resourceId === input.slot.staffId,
        );
        const row = await client.query<{ id: string }>(
          `INSERT INTO booking_items (booking_id, position, service_id, staff_resource_id, service_snapshot, price_cents)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [
            bookingId,
            position,
            item.serviceId,
            staffAssignment?.resourceId ?? input.slot.staffId,
            JSON.stringify(item.snapshot),
            item.priceCents,
          ],
        );
        itemIds.push(row.rows[0]?.id ?? '');
      }
      for (const a of input.slot.assignments) {
        await client.query(
          `INSERT INTO allocations (location_id, resource_id, booking_id, booking_item_id, kind, during)
           VALUES ($1, $2, $3, $4, $5, tstzrange($6, $7, '[)'))`,
          [
            input.locationId,
            a.resourceId,
            bookingId,
            itemIds[a.serviceIndex] ?? null,
            a.kind,
            new Date(a.interval.start).toISOString(),
            new Date(a.interval.end).toISOString(),
          ],
        );
      }
      await client.query('COMMIT');
      return { ok: true, bookingId };
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      const code = pgCode(e);
      if (code === PG.EXCLUSION_VIOLATION) return { ok: false, reason: 'slot-taken' };
      if (code === UNIQUE_VIOLATION && pgConstraint(e) === IDEMPOTENCY_CONSTRAINT)
        return { ok: false, reason: 'duplicate-key' };
      if (code === PG.DEADLOCK_DETECTED || code === PG.LOCK_NOT_AVAILABLE) {
        if (attempt === 0) continue;
        return { ok: false, reason: 'busy' };
      }
      throw e;
    } finally {
      client.release();
    }
  }
}

// ───────────────────────────── Lettura e rilascio ─────────────────────────────

export interface HoldView {
  readonly id: string;
  readonly status: 'held' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'expired';
  readonly locationId: string;
  readonly locationSlug: string;
  readonly timezone: string;
  readonly currency: string;
  readonly start: Date;
  readonly end: Date;
  readonly expiresAt: Date | null;
  readonly totalCents: number;
  readonly sessionHash: Buffer | null;
  readonly items: readonly {
    readonly slug: string;
    readonly name: Readonly<Record<string, string>>;
    readonly priceCents: number;
    readonly priceIsFrom: boolean;
  }[];
}

interface HoldRow {
  id: string;
  status: HoldView['status'];
  location_id: string;
  location_slug: string;
  timezone: string;
  currency: string;
  s: Date;
  e: Date;
  hold_expires_at: Date | null;
  total_price_cents: number;
  hold_session_hash: Buffer | null;
}

async function readHold(c: pg.PoolClient, where: string, params: unknown[]): Promise<HoldView | undefined> {
  const r = await c.query<HoldRow>(
    `SELECT b.id, b.status, l.id AS location_id, l.slug AS location_slug, l.timezone, b.currency, lower(b.period) AS s,
            upper(b.period) AS e, b.hold_expires_at, b.total_price_cents, b.hold_session_hash
       FROM bookings b JOIN locations l ON l.id = b.location_id
      WHERE ${where}`,
    params,
  );
  const row = r.rows[0];
  if (row === undefined) return undefined;
  const items = await c.query<{
    slug: string;
    name: Record<string, string>;
    price_cents: number;
    price_is_from: boolean;
  }>(
    `SELECT s.slug, COALESCE(bi.service_snapshot->'name', s.name) AS name, bi.price_cents,
            COALESCE((bi.service_snapshot->>'priceIsFrom')::boolean, s.price_is_from) AS price_is_from
       FROM booking_items bi JOIN services s ON s.id = bi.service_id
      WHERE bi.booking_id = $1 ORDER BY bi.position`,
    [row.id],
  );
  return {
    id: row.id,
    status: row.status,
    locationId: row.location_id,
    locationSlug: row.location_slug,
    timezone: row.timezone,
    currency: row.currency,
    start: row.s,
    end: row.e,
    expiresAt: row.hold_expires_at,
    totalCents: row.total_price_cents,
    sessionHash: row.hold_session_hash,
    items: items.rows.map((i) => ({
      slug: i.slug,
      name: i.name,
      priceCents: i.price_cents,
      priceIsFrom: i.price_is_from,
    })),
  };
}

// Le clausole WHERE sono costanti del modulo: i valori passano SEMPRE come parametri ($1, $2).
export function getHold(
  pool: pg.Pool,
  organizationId: string,
  bookingId: string,
): Promise<HoldView | undefined> {
  return withOrgTx(pool, organizationId, (c) => readHold(c, 'b.id = $1', [bookingId]));
}

/** Richiesta ripetuta con la stessa Idempotency-Key (docs/06 E19): restituisce la prenotazione già creata. */
export function findByIdempotencyKey(
  pool: pg.Pool,
  organizationId: string,
  locationSlug: string,
  key: string,
): Promise<HoldView | undefined> {
  return withOrgTx(pool, organizationId, (c) =>
    readHold(c, 'l.slug = $1 AND b.idempotency_key = $2', [locationSlug, key]),
  );
}

export type ReleaseResult = 'released' | 'not-found' | 'not-owned' | 'not-held';

/**
 * L'utente torna indietro: l'hold passa a 'cancelled' e il trigger libera le risorse.
 * Idempotente: un hold già scaduto o rilasciato dalla stessa sessione risponde 'released'.
 */
export async function releaseHold(
  pool: pg.Pool,
  input: { organizationId: string; bookingId: string; sessionHash: Buffer | null; now: Date },
): Promise<ReleaseResult> {
  return withOrgTx(pool, input.organizationId, async (c) => {
    const r = await c.query<{ status: string; hold_session_hash: Buffer | null }>(
      'SELECT status, hold_session_hash FROM bookings WHERE id = $1 FOR UPDATE',
      [input.bookingId],
    );
    const b = r.rows[0];
    if (b === undefined) return 'not-found';
    if (b.status !== 'held' && b.status !== 'expired' && b.status !== 'cancelled') return 'not-held';
    if (
      b.hold_session_hash === null ||
      input.sessionHash === null ||
      !b.hold_session_hash.equals(input.sessionHash)
    )
      return 'not-owned';
    if (b.status === 'held')
      await c.query(
        `UPDATE bookings SET status = 'cancelled', cancelled_at = $2, cancelled_by = 'customer',
                cancel_reason = 'released', version = version + 1, updated_at = now()
          WHERE id = $1`,
        [input.bookingId, input.now],
      );
    return 'released';
  });
}
