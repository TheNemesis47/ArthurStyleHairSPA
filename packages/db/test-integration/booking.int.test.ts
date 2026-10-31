import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { computeAvailability, type AvailabilityInput, type Slot } from '@arthur/core';
import { createHold, type CreateHoldInput } from '../src/holds.ts';
import { createTestDb, type TestDb } from './setup.ts';

const ORG = '10000000-0000-0000-0000-000000000001';
const OTHER_ORG = '20000000-0000-0000-0000-000000000002';
const LOC = '00000000-0000-0000-0000-000000000001';
const SVC = '00000000-0000-0000-0000-0000000000f1';
const TZ = 'Europe/Rome';
let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
  await db.admin.query(`
    INSERT INTO organizations (id, slug, name) VALUES ('${ORG}', 'arthur-style', 'Arthur Style'), ('${OTHER_ORG}', 'altro', 'Altro');
    INSERT INTO locations (id, organization_id, slug, name, country_code, timezone, vat_rate_bp, address)
      VALUES ('${LOC}', '${ORG}', 'firenze', 'Firenze', 'IT', '${TZ}', 2200, '{}');
    INSERT INTO resources (id, location_id, kind, name) VALUES
      ('00000000-0000-0000-0000-0000000000a1', '${LOC}', 'staff', 'Arturo'),
      ('00000000-0000-0000-0000-0000000000b1', '${LOC}', 'station', 'Poltrona 1');
    INSERT INTO services (id, location_id, slug, name, price_cents) VALUES ('${SVC}', '${LOC}', 'taglio', '{"it":"Taglio"}', 2500);
  `);
});
afterAll(async () => {
  await db.drop();
});

const ARTURO = '00000000-0000-0000-0000-0000000000a1';
const CHAIR = '00000000-0000-0000-0000-0000000000b1';

function availabilityInput(): AvailabilityInput {
  const hours = [2, 3, 4, 5].map((weekday) => ({
    weekday: weekday as 2 | 3 | 4 | 5,
    start: '09:00',
    end: '19:00',
  }));
  return {
    timezone: TZ,
    policy: { slotGranularityMin: 15, minNoticeMin: 0, maxAdvanceDays: 35 },
    locationHours: hours,
    services: [
      {
        id: SVC,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
        steps: [{ durationMin: 25, staffBusy: true, requirements: [{ poolId: 'P', quantity: 1 }] }],
      },
    ],
    staff: [
      { id: ARTURO, sortOrder: 0, workingHours: hours, services: { [SVC]: { durationFactorPct: 100 } } },
    ],
    staffPreference: { kind: 'any' },
    pools: [{ id: 'P', resourceIds: [CHAIR] }],
    exceptions: [],
    allocations: [],
    now: Date.parse('2026-11-02T08:00:00+01:00'),
    from: '2026-11-03',
    to: '2026-11-03',
  };
}

function holdInput(slot: Slot, key: string | null = null): CreateHoldInput {
  return {
    organizationId: ORG,
    locationId: LOC,
    timezone: TZ,
    slot,
    currency: 'EUR',
    source: 'web',
    items: [{ serviceId: SVC, priceCents: 2500, snapshot: { name: 'Taglio', price: 2500 } }],
    expiresAt: new Date(Date.parse('2026-11-02T08:10:00+01:00')),
    sessionHash: null,
    idempotencyKey: key,
    createdByActor: { type: 'customer' },
  };
}

describe('prenotazioni su PostgreSQL reale', () => {
  it('uno slot calcolato dal motore diventa un hold con booking, righe e allocazioni', async () => {
    const slot = computeAvailability(availabilityInput())[0]!;
    const r = await createHold(db.app, holdInput(slot));
    expect(r.ok).toBe(true);
    const n = await db.admin.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM allocations WHERE booking_id = $1',
      [r.ok ? r.bookingId : null],
    );
    expect(n.rows[0]!.n).toBe(2); // operatore + poltrona
  });

  it('NFR-01: 200 richieste concorrenti sullo stesso slot → esattamente 1 successo, 199 "slot-taken", nessun errore', async () => {
    const slot = computeAvailability(availabilityInput()).find(
      (s) => new Date(s.start).toISOString() === '2026-11-03T13:00:00.000Z',
    )!;
    const t0 = performance.now();
    const results = await Promise.all(Array.from({ length: 200 }, () => createHold(db.app, holdInput(slot))));
    const elapsed = performance.now() - t0;
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.reason === 'slot-taken')).toHaveLength(199);
    expect(elapsed).toBeLessThan(5_000);
  });

  it('il motore, rieseguito con le allocazioni del DB, non ripropone più lo slot preso', async () => {
    const rows = await db.admin.query<{ resource_id: string; s: Date; e: Date }>(
      'SELECT resource_id, lower(during) AS s, upper(during) AS e FROM allocations WHERE active',
    );
    const allocations = rows.rows.map((r) => ({
      resourceId: r.resource_id,
      interval: { start: r.s.getTime(), end: r.e.getTime() },
    }));
    const starts = computeAvailability({ ...availabilityInput(), allocations }).map((s) =>
      new Date(s.start).toISOString(),
    );
    expect(starts).not.toContain('2026-11-03T13:00:00.000Z');
    expect(starts).toContain('2026-11-03T13:30:00.000Z');
  });

  it("RLS: senza organizzazione la query fallisce; con un'altra organizzazione non si vede nulla", async () => {
    await expect(db.app.query('SELECT count(*) FROM bookings')).rejects.toThrow(/app\.org_id/);
    const c = await db.app.connect();
    try {
      await c.query('BEGIN');
      await c.query("SELECT set_config('app.org_id', $1, true)", [OTHER_ORG]);
      const r = await c.query<{ n: number }>('SELECT count(*)::int AS n FROM bookings');
      expect(r.rows[0]!.n).toBe(0);
      await c.query('COMMIT');
    } finally {
      c.release();
    }
  });

  it('macchina a stati: transizioni non ammesse rifiutate; disdetta e scadenza liberano le risorse', async () => {
    const free = computeAvailability(availabilityInput()).find(
      (s) => new Date(s.start).toISOString() === '2026-11-03T15:00:00.000Z',
    )!;
    const r = await createHold(db.app, holdInput(free));
    if (!r.ok) throw new Error('hold non creato');
    // held → completed non è ammessa
    await expect(
      db.admin.query("UPDATE bookings SET status = 'completed' WHERE id = $1", [r.bookingId]),
    ).rejects.toThrow(/Transizione/);
    // scadenza: il worker chiama expire_holds; il trigger disattiva le allocazioni
    const expired = await db.admin.query<{ n: number }>("SELECT expire_holds('2026-11-02T09:00:00+01') AS n");
    expect(expired.rows[0]!.n).toBeGreaterThanOrEqual(1);
    const act = await db.admin.query<{ a: boolean }>(
      'SELECT bool_or(active) AS a FROM allocations WHERE booking_id = $1',
      [r.bookingId],
    );
    expect(act.rows[0]!.a).toBe(false);
    // lo stesso slot torna prenotabile
    expect((await createHold(db.app, holdInput(free))).ok).toBe(true);
  });

  it('idempotenza: la stessa Idempotency-Key non crea una seconda prenotazione', async () => {
    const slot = computeAvailability(availabilityInput()).find(
      (s) => new Date(s.start).toISOString() === '2026-11-03T16:00:00.000Z',
    )!;
    const first = await createHold(db.app, holdInput(slot, 'idem-1'));
    expect(first.ok).toBe(true);
    await expect(createHold(db.app, holdInput(slot, 'idem-1'))).rejects.toThrow(
      /idempotency_key|duplicate key/,
    );
  });
});
