import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHold } from '../src/holds.ts';
import { BookingRejected, cancelBooking, confirmHold, rescheduleBooking, sha256 } from '../src/bookings.ts';
import { createTestDb, type TestDb } from './setup.ts';
import { ARTURO, LOC, NOW, ORG, STAFF2, TZ, holdInput, seed, slotAt } from './fixtures.ts';

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
  await seed(db);
});
afterAll(async () => {
  await db.drop();
});

const customer = { firstName: 'Maria', lastName: 'Rossi', email: 'maria@example.com', locale: 'it' };
const confirmIn = (bookingId: string, over: Partial<Parameters<typeof confirmHold>[1]> = {}) => ({
  organizationId: ORG,
  bookingId,
  sessionHash: null,
  customer,
  now: new Date(NOW.getTime() + 5 * 60_000),
  maxFutureBookings: 3,
  ...over,
});
const rejected = (reason: string) => expect.objectContaining({ reason }) as unknown;

async function hold(
  dateIso: [string, string],
  opts: Parameters<typeof holdInput>[1] = {},
  pref?: Parameters<typeof slotAt>[3],
): Promise<string> {
  const r = await createHold(db.app, holdInput(await slotAt(db, dateIso[0], dateIso[1], pref), opts));
  if (!r.ok) throw new Error(`hold non creato: ${r.reason}`);
  return r.bookingId;
}

describe('conferma (docs/06 §4)', () => {
  it("conferma l'hold, crea il cliente con email verificata e salva solo l'hash del token", async () => {
    const id = await hold(['2026-11-10', '2026-11-10T08:00:00.000Z']);
    const { manageToken, customerId } = await confirmHold(db.app, confirmIn(id));
    expect(manageToken.length).toBeGreaterThanOrEqual(43); // 256 bit in base64url
    const row = await db.admin.query<{ status: string; customer_id: string; h: Buffer }>(
      'SELECT status, customer_id, manage_token_hash AS h FROM bookings WHERE id = $1',
      [id],
    );
    expect(row.rows[0]).toMatchObject({ status: 'confirmed', customer_id: customerId });
    expect(row.rows[0]!.h.equals(sha256(manageToken))).toBe(true);
    await expect(confirmHold(db.app, confirmIn(id))).rejects.toEqual(rejected('not-held'));
  });

  it("rifiuta hold scaduti e hold creati da un'altra sessione", async () => {
    const a = await hold(['2026-11-10', '2026-11-10T08:30:00.000Z']);
    await expect(
      confirmHold(db.app, confirmIn(a, { now: new Date(NOW.getTime() + 11 * 60_000) })),
    ).rejects.toEqual(rejected('hold-expired'));
    const b = await hold(['2026-11-10', '2026-11-10T09:00:00.000Z'], { session: sha256('sessione-A') });
    await expect(confirmHold(db.app, confirmIn(b, { sessionHash: sha256('sessione-B') }))).rejects.toEqual(
      rejected('hold-not-owned'),
    );
    await expect(
      confirmHold(
        db.app,
        confirmIn(b, {
          sessionHash: sha256('sessione-A'),
          customer: { ...customer, email: 'altra@example.com' },
        }),
      ),
    ).resolves.toBeDefined();
  });

  it('lo stesso cliente non può avere due appuntamenti sovrapposti (anche con operatori diversi)', async () => {
    const a = await hold(['2026-11-11', '2026-11-11T09:00:00.000Z'], {}, { kind: 'staff', staffId: ARTURO });
    const b = await hold(['2026-11-11', '2026-11-11T09:00:00.000Z'], {}, { kind: 'staff', staffId: STAFF2 });
    const c3 = { ...customer, email: 'doppia@example.com' };
    await confirmHold(db.app, confirmIn(a, { customer: c3 }));
    await expect(confirmHold(db.app, confirmIn(b, { customer: c3 }))).rejects.toEqual(
      rejected('customer-overlap'),
    );
  });

  it('limite di prenotazioni future per cliente', async () => {
    const c4 = { ...customer, email: 'tante@example.com' };
    for (const t of ['10:00', '11:00'])
      await confirmHold(
        db.app,
        confirmIn(await hold(['2026-11-12', `2026-11-12T${t}:00.000Z`]), {
          customer: c4,
          maxFutureBookings: 2,
        }),
      );
    const third = await hold(['2026-11-12', '2026-11-12T12:00:00.000Z']);
    await expect(
      confirmHold(db.app, confirmIn(third, { customer: c4, maxFutureBookings: 2 })),
    ).rejects.toEqual(rejected('too-many-future-bookings'));
  });
});

describe('disdetta (BOOK-09: fino a 4 giorni prima)', () => {
  const cancelIn = (bookingId: string, by: 'customer' | 'staff') => ({
    organizationId: ORG,
    bookingId,
    by,
    reason: null,
    now: NOW,
    cancelWindowMin: 5760,
  });

  it('il cliente non può disdire a meno di 4 giorni; lo staff sì, e la risorsa si libera', async () => {
    const id = await hold(['2026-11-04', '2026-11-04T09:00:00.000Z']);
    await confirmHold(db.app, confirmIn(id, { customer: { ...customer, email: 'vicina@example.com' } }));
    await expect(cancelBooking(db.app, cancelIn(id, 'customer'))).rejects.toEqual(rejected('outside-policy'));
    await cancelBooking(db.app, cancelIn(id, 'staff'));
    const act = await db.admin.query<{ a: boolean }>(
      'SELECT bool_or(active) AS a FROM allocations WHERE booking_id = $1',
      [id],
    );
    expect(act.rows[0]!.a).toBe(false);
  });

  it('il cliente disdice liberamente con più di 4 giorni di anticipo', async () => {
    const id = await hold(['2026-11-13', '2026-11-13T09:00:00.000Z']);
    await confirmHold(db.app, confirmIn(id, { customer: { ...customer, email: 'lontana@example.com' } }));
    await expect(cancelBooking(db.app, cancelIn(id, 'customer'))).resolves.toEqual({ reprotected: 0 });
  });

  it('docs/06 §6: annullando la prenotazione "sotto", la sovrapposizione forzata torna protetta dal vincolo', async () => {
    const id = await hold(['2026-11-17', '2026-11-17T09:00:00.000Z'], {}, { kind: 'staff', staffId: ARTURO });
    await confirmHold(db.app, confirmIn(id, { customer: { ...customer, email: 'sotto@example.com' } }));
    // incastro voluto dall'owner sopra Arturo, 09:10–09:30 UTC
    await db.admin.query(
      `INSERT INTO allocations (location_id, resource_id, kind, during, forced) VALUES ($1, $2, 'block', tstzrange('2026-11-17T09:10Z','2026-11-17T09:30Z','[)'), true)`,
      [LOC, ARTURO],
    );
    const r = await cancelBooking(db.app, {
      organizationId: ORG,
      bookingId: id,
      by: 'staff',
      reason: 'test',
      now: NOW,
      cancelWindowMin: 5760,
    });
    expect(r.reprotected).toBe(1);
    // ora un normale inserimento sopra quell'incastro viene RIFIUTATO dal database
    await expect(
      db.admin.query(
        `INSERT INTO allocations (location_id, resource_id, kind, during) VALUES ($1, $2, 'block', tstzrange('2026-11-17T09:15Z','2026-11-17T09:20Z','[)'))`,
        [LOC, ARTURO],
      ),
    ).rejects.toThrow(/allocations_no_overlap/);
  });
});

describe('spostamento atomico (docs/06 §5)', () => {
  it('sposta su un orario libero e libera quello vecchio', async () => {
    const id = await hold(['2026-11-18', '2026-11-18T09:00:00.000Z'], {}, { kind: 'staff', staffId: ARTURO });
    await confirmHold(db.app, confirmIn(id, { customer: { ...customer, email: 'sposta@example.com' } }));
    await rescheduleBooking(db.app, {
      organizationId: ORG,
      bookingId: id,
      timezone: TZ,
      slot: await slotAt(db, '2026-11-18', '2026-11-18T14:00:00.000Z', { kind: 'staff', staffId: ARTURO }),
      by: 'staff',
      now: NOW,
      rescheduleWindowMin: 5760,
    });
    const p = await db.admin.query<{ s: Date }>('SELECT lower(period) AS s FROM bookings WHERE id = $1', [
      id,
    ]);
    expect(p.rows[0]!.s.toISOString()).toBe('2026-11-18T14:00:00.000Z');
    // il vecchio orario è di nuovo prenotabile con Arturo
    expect(
      (
        await createHold(
          db.app,
          holdInput(
            await slotAt(db, '2026-11-18', '2026-11-18T09:00:00.000Z', { kind: 'staff', staffId: ARTURO }),
          ),
        )
      ).ok,
    ).toBe(true);
  });

  it('se il nuovo orario è occupato, la prenotazione originale resta intatta', async () => {
    const mine = await hold(
      ['2026-11-19', '2026-11-19T09:00:00.000Z'],
      {},
      { kind: 'staff', staffId: ARTURO },
    );
    await confirmHold(db.app, confirmIn(mine, { customer: { ...customer, email: 'intatta@example.com' } }));
    const target = await slotAt(db, '2026-11-19', '2026-11-19T15:00:00.000Z', {
      kind: 'staff',
      staffId: ARTURO,
    });
    expect((await createHold(db.app, holdInput(target))).ok).toBe(true); // qualcun altro lo prende prima
    await expect(
      rescheduleBooking(db.app, {
        organizationId: ORG,
        bookingId: mine,
        timezone: TZ,
        slot: target,
        by: 'staff',
        now: NOW,
        rescheduleWindowMin: 5760,
      }),
    ).rejects.toEqual(rejected('slot-taken'));
    const p = await db.admin.query<{ s: Date; n: number }>(
      'SELECT lower(b.period) AS s, (SELECT count(*)::int FROM allocations a WHERE a.booking_id = b.id AND a.active) AS n FROM bookings b WHERE id = $1',
      [mine],
    );
    expect(p.rows[0]!.s.toISOString()).toBe('2026-11-19T09:00:00.000Z');
    expect(p.rows[0]!.n).toBe(2);
  });

  it('le eccezioni di dominio sono istanze di BookingRejected', async () => {
    await expect(
      confirmHold(db.app, confirmIn('00000000-0000-0000-0000-00000000dead')),
    ).rejects.toBeInstanceOf(BookingRejected);
  });
});
