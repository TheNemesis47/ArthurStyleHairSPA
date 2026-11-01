import { createHash, randomBytes } from 'node:crypto';
import type pg from 'pg';
import type { Slot } from '@arthur/core';
import { advisoryLockKeys } from './lock-keys.ts';
import { PG, pgCode, pgConstraint } from './errors.ts';
import { lockKeys, withOrgTx } from './tx.ts';

const MINUTE = 60_000;

/** 23P01 può venire da due vincoli diversi: risorsa occupata o cliente già impegnato. */
function overlapReason(e: unknown): BookingRejection {
  return pgConstraint(e) === 'bookings_customer_no_overlap' ? 'customer-overlap' : 'slot-taken';
}

/** Errore di dominio previsto: l'API lo traduce in problem+json (docs/07 §6). */
export class BookingRejected extends Error {
  readonly reason: BookingRejection;

  constructor(reason: BookingRejection) {
    super(reason);
    this.reason = reason;
  }
}

export type BookingRejection =
  | 'not-found'
  | 'not-held'
  | 'hold-expired'
  | 'hold-not-owned'
  | 'customer-blocked'
  | 'too-many-future-bookings'
  | 'customer-overlap'
  | 'not-confirmed'
  | 'outside-policy'
  | 'slot-taken';

export const sha256 = (value: string | Buffer): Buffer => createHash('sha256').update(value).digest();

interface BookingRow {
  id: string;
  status: string;
  location_id: string;
  hold_expires_at: Date | null;
  hold_session_hash: Buffer | null;
  starts_at: Date;
}

async function loadForUpdate(c: pg.PoolClient, bookingId: string): Promise<BookingRow> {
  const r = await c.query<BookingRow>(
    `SELECT id, status, location_id, hold_expires_at, hold_session_hash, lower(period) AS starts_at
       FROM bookings WHERE id = $1 FOR UPDATE`,
    [bookingId],
  );
  const row = r.rows[0];
  if (row === undefined) throw new BookingRejected('not-found');
  return row;
}

// ───────────────────────────── Conferma ─────────────────────────────

export interface ConfirmHoldInput {
  readonly organizationId: string;
  readonly bookingId: string;
  /** Hash della sessione che ha creato l'hold (cookie/dispositivo). */
  readonly sessionHash: Buffer | null;
  /** Il contatto è già stato verificato con OTP (BOOK-07): qui arriva solo un'email verificata. */
  readonly customer: {
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
    readonly locale: string;
  };
  readonly now: Date;
  readonly maxFutureBookings: number;
}

/** Conferma un hold (docs/06 §4). Restituisce il token del link di gestione: in DB si salva solo l'hash. */
export async function confirmHold(
  pool: pg.Pool,
  input: ConfirmHoldInput,
): Promise<{ manageToken: string; customerId: string }> {
  try {
    return await withOrgTx(pool, input.organizationId, async (c) => {
      const b = await loadForUpdate(c, input.bookingId);
      if (b.status !== 'held') throw new BookingRejected('not-held');
      if (
        b.hold_session_hash !== null &&
        (input.sessionHash === null || !b.hold_session_hash.equals(input.sessionHash))
      )
        throw new BookingRejected('hold-not-owned');
      if (b.hold_expires_at === null || b.hold_expires_at.getTime() <= input.now.getTime())
        throw new BookingRejected('hold-expired');

      // un solo profilo per email verificata nell'organizzazione (Q39, indice customers_verified_email_uq)
      const found = await c.query<{ id: string; blocked_at: Date | null }>(
        `SELECT id, blocked_at FROM customers
          WHERE organization_id = $1 AND email = $2 AND email_verified_at IS NOT NULL AND anonymized_at IS NULL`,
        [input.organizationId, input.customer.email],
      );
      let customerId = found.rows[0]?.id;
      if (found.rows[0]?.blocked_at != null) throw new BookingRejected('customer-blocked');
      if (customerId === undefined) {
        const ins = await c.query<{ id: string }>(
          `INSERT INTO customers (organization_id, first_name, last_name, email, email_verified_at, preferred_locale)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [
            input.organizationId,
            input.customer.firstName,
            input.customer.lastName,
            input.customer.email,
            input.now,
            input.customer.locale,
          ],
        );
        customerId = ins.rows[0]?.id;
        if (customerId === undefined) throw new Error('INSERT customers senza id');
      }

      const future = await c.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM bookings
          WHERE customer_id = $1 AND status IN ('held','confirmed') AND lower(period) > $2`,
        [customerId, input.now],
      );
      if ((future.rows[0]?.n ?? 0) >= input.maxFutureBookings)
        throw new BookingRejected('too-many-future-bookings');

      const manageToken = randomBytes(32).toString('base64url'); // 256 bit
      await c.query(
        `UPDATE bookings SET status = 'confirmed', customer_id = $2, hold_expires_at = NULL, hold_session_hash = NULL,
                manage_token_hash = $3, version = version + 1, updated_at = now()
          WHERE id = $1`,
        [input.bookingId, customerId, sha256(manageToken)],
      );
      return { manageToken, customerId };
    });
  } catch (e) {
    if (pgCode(e) === PG.EXCLUSION_VIOLATION) throw new BookingRejected(overlapReason(e));
    throw e;
  }
}

// ───────────────────────────── Disdetta ─────────────────────────────

export interface CancelInput {
  readonly organizationId: string;
  readonly bookingId: string;
  readonly by: 'customer' | 'staff' | 'system' | 'agent';
  readonly reason: string | null;
  readonly now: Date;
  /** Finestra di disdetta libera per il cliente (default policy: 4 giorni = 5760'). Lo staff non ha limiti. */
  readonly cancelWindowMin: number;
}

/**
 * Annulla una prenotazione confermata. Nella STESSA transazione (docs/06 §6) prova a "riproteggere" le
 * sovrapposizioni forzate che pesavano su questa prenotazione: se non c'è più conflitto, tornano sotto il vincolo.
 */
export async function cancelBooking(pool: pg.Pool, input: CancelInput): Promise<{ reprotected: number }> {
  return withOrgTx(pool, input.organizationId, async (c) => {
    const b = await loadForUpdate(c, input.bookingId);
    if (b.status !== 'confirmed') throw new BookingRejected('not-confirmed');
    if (
      input.by === 'customer' &&
      b.starts_at.getTime() - input.now.getTime() < input.cancelWindowMin * MINUTE
    )
      throw new BookingRejected('outside-policy');

    const mine = await c.query<{ resource_id: string; s: Date; e: Date }>(
      'SELECT resource_id, lower(during) AS s, upper(during) AS e FROM allocations WHERE booking_id = $1 AND active',
      [input.bookingId],
    );
    await c.query(
      `UPDATE bookings SET status = 'cancelled', cancelled_at = $2, cancelled_by = $3, cancel_reason = $4,
              version = version + 1, updated_at = now()
        WHERE id = $1`,
      [input.bookingId, input.now, input.by, input.reason],
    );

    let reprotected = 0;
    for (const a of mine.rows) {
      const forced = await c.query<{ id: string }>(
        `SELECT id FROM allocations WHERE forced AND active AND resource_id = $1 AND during && tstzrange($2, $3, '[)')`,
        [a.resource_id, a.s, a.e],
      );
      for (const f of forced.rows) {
        await c.query('SAVEPOINT reprotect');
        try {
          await c.query('UPDATE allocations SET forced = false WHERE id = $1', [f.id]);
          await c.query('RELEASE SAVEPOINT reprotect');
          reprotected++;
        } catch (e) {
          if (pgCode(e) !== PG.EXCLUSION_VIOLATION) throw e;
          await c.query('ROLLBACK TO SAVEPOINT reprotect'); // ancora in conflitto con altro: resta forzata
        }
      }
    }
    return { reprotected };
  });
}

// ───────────────────────────── Spostamento ─────────────────────────────

export interface RescheduleInput {
  readonly organizationId: string;
  readonly bookingId: string;
  readonly timezone: string;
  /** Nuovo slot calcolato dal motore con gli stessi servizi. */
  readonly slot: Slot;
  readonly by: 'customer' | 'staff' | 'system' | 'agent';
  readonly now: Date;
  readonly rescheduleWindowMin: number;
}

/** Spostamento ATOMICO (docs/06 §5): se il nuovo orario è occupato, la prenotazione originale resta intatta. */
export async function rescheduleBooking(pool: pg.Pool, input: RescheduleInput): Promise<void> {
  try {
    await withOrgTx(pool, input.organizationId, async (c) => {
      const old = await c.query<{ resource_id: string; s: Date; e: Date }>(
        'SELECT resource_id, lower(during) AS s, upper(during) AS e FROM allocations WHERE booking_id = $1 AND active',
        [input.bookingId],
      );
      const oldAssign = old.rows.map((r) => ({
        resourceId: r.resource_id,
        interval: { start: r.s.getTime(), end: r.e.getTime() },
      }));
      await lockKeys(c, advisoryLockKeys([...oldAssign, ...input.slot.assignments], input.timezone));

      const b = await loadForUpdate(c, input.bookingId);
      if (b.status !== 'confirmed') throw new BookingRejected('not-confirmed');
      if (
        input.by === 'customer' &&
        b.starts_at.getTime() - input.now.getTime() < input.rescheduleWindowMin * MINUTE
      )
        throw new BookingRejected('outside-policy');

      const items = await c.query<{ id: string; position: number }>(
        'SELECT id, position FROM booking_items WHERE booking_id = $1 ORDER BY position',
        [input.bookingId],
      );
      await c.query('DELETE FROM allocations WHERE booking_id = $1', [input.bookingId]);
      for (const a of input.slot.assignments) {
        await c.query(
          `INSERT INTO allocations (location_id, resource_id, booking_id, booking_item_id, kind, during)
           VALUES ($1, $2, $3, $4, $5, tstzrange($6, $7, '[)'))`,
          [
            b.location_id,
            a.resourceId,
            input.bookingId,
            items.rows.find((i) => i.position === a.serviceIndex)?.id ?? null,
            a.kind,
            new Date(a.interval.start),
            new Date(a.interval.end),
          ],
        );
      }
      await c.query('UPDATE booking_items SET staff_resource_id = $2 WHERE booking_id = $1', [
        input.bookingId,
        input.slot.staffId,
      ]);
      await c.query(
        `UPDATE bookings SET period = tstzrange($2, $3, '[)'), version = version + 1, updated_at = now() WHERE id = $1`,
        [input.bookingId, new Date(input.slot.customerStart), new Date(input.slot.customerEnd)],
      );
    });
  } catch (e) {
    if (pgCode(e) === PG.EXCLUSION_VIOLATION) throw new BookingRejected(overlapReason(e));
    throw e;
  }
}
