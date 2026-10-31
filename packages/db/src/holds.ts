import type pg from 'pg';
import type { Slot } from '@arthur/core';
import { advisoryLockKeys } from './lock-keys.ts';
import { PG, pgCode } from './errors.ts';

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
  readonly expiresAt: Date;
  readonly sessionHash: Buffer | null;
  readonly idempotencyKey: string | null;
  readonly createdByActor: Readonly<Record<string, unknown>>;
}

export type CreateHoldResult =
  | { readonly ok: true; readonly bookingId: string }
  | { readonly ok: false; readonly reason: 'slot-taken' | 'busy' };

/**
 * Crea un hold (prenotazione provvisoria) e le sue allocazioni in un'unica transazione (docs/06 §4).
 * - lock advisory ordinati per (risorsa, giorno) → contesa ordinata, niente deadlock;
 * - il vincolo EXCLUDE decide: 23P01 → 'slot-taken' (l'API risponde 409 con alternative);
 * - 40P01/55P03 → un solo nuovo tentativo, poi 'busy' (503). MAI un errore non gestito.
 */
export async function createHold(pool: pg.Pool, input: CreateHoldInput): Promise<CreateHoldResult> {
  if (input.items.length === 0) throw new RangeError('Serve almeno un servizio');
  const keys = advisoryLockKeys(input.slot.assignments, input.timezone);
  const total = input.items.reduce((s, i) => s + i.priceCents, 0);

  for (let attempt = 0; ; attempt++) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.org_id', $1, true)", [input.organizationId]);
      await client.query("SET LOCAL lock_timeout = '5s'");
      for (const key of keys)
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [key]);

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
