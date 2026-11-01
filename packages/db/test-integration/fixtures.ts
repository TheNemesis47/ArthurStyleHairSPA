import { computeAvailability, type AvailabilityInput, type Slot, type StaffPreference } from '@arthur/core';
import type { CreateHoldInput } from '../src/holds.ts';
import type { TestDb } from './setup.ts';

export const ORG = '10000000-0000-0000-0000-000000000001';
export const OTHER_ORG = '20000000-0000-0000-0000-000000000002';
export const LOC = '00000000-0000-0000-0000-000000000001';
export const SVC = '00000000-0000-0000-0000-0000000000f1';
export const ARTURO = '00000000-0000-0000-0000-0000000000a1';
export const STAFF2 = '00000000-0000-0000-0000-0000000000a2';
export const CHAIRS = ['00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2'];
export const TZ = 'Europe/Rome';
export const NOW = new Date('2026-11-02T08:00:00+01:00'); // lunedì

export async function seed(db: TestDb): Promise<void> {
  await db.admin.query(`
    INSERT INTO organizations (id, slug, name) VALUES ('${ORG}', 'arthur-style', 'Arthur Style'), ('${OTHER_ORG}', 'altro', 'Altro');
    INSERT INTO locations (id, organization_id, slug, name, country_code, timezone, vat_rate_bp, address)
      VALUES ('${LOC}', '${ORG}', 'firenze', 'Firenze', 'IT', '${TZ}', 2200, '{}');
    INSERT INTO resources (id, location_id, kind, name) VALUES
      ('${ARTURO}', '${LOC}', 'staff', 'Arturo'), ('${STAFF2}', '${LOC}', 'staff', 'Collaboratore'),
      ('${CHAIRS[0]!}', '${LOC}', 'station', 'Poltrona 1'), ('${CHAIRS[1]!}', '${LOC}', 'station', 'Poltrona 2');
    INSERT INTO services (id, location_id, slug, name, price_cents) VALUES ('${SVC}', '${LOC}', 'taglio', '{"it":"Taglio"}', 2500);
  `);
}

const HOURS = ([2, 3, 4, 5] as const).map((weekday) => ({ weekday, start: '09:00', end: '19:00' }));

export function availability(
  date: string,
  staffPreference: StaffPreference = { kind: 'any' },
  allocations: AvailabilityInput['allocations'] = [],
): Slot[] {
  return computeAvailability({
    timezone: TZ,
    policy: { slotGranularityMin: 15, minNoticeMin: 0, maxAdvanceDays: 35 },
    locationHours: HOURS,
    services: [
      {
        id: SVC,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
        steps: [{ durationMin: 25, staffBusy: true, requirements: [{ poolId: 'P', quantity: 1 }] }],
      },
    ],
    staff: [
      { id: ARTURO, sortOrder: 0, workingHours: HOURS, services: { [SVC]: { durationFactorPct: 100 } } },
      { id: STAFF2, sortOrder: 1, workingHours: HOURS, services: { [SVC]: { durationFactorPct: 100 } } },
    ],
    staffPreference,
    pools: [{ id: 'P', resourceIds: CHAIRS }],
    exceptions: [],
    allocations,
    now: NOW.getTime(),
    from: date,
    to: date,
  });
}

/** Slot alle isoStart calcolato sulle allocazioni ATTIVE presenti nel DB (come farà l'API). */
export async function slotAt(
  db: TestDb,
  date: string,
  isoStart: string,
  pref?: StaffPreference,
): Promise<Slot> {
  const rows = await db.admin.query<{ resource_id: string; s: Date; e: Date }>(
    'SELECT resource_id, lower(during) AS s, upper(during) AS e FROM allocations WHERE active',
  );
  const allocations = rows.rows.map((r) => ({
    resourceId: r.resource_id,
    interval: { start: r.s.getTime(), end: r.e.getTime() },
  }));
  const s = availability(date, pref, allocations).find((x) => new Date(x.start).toISOString() === isoStart);
  if (s === undefined) throw new Error(`Nessuno slot alle ${isoStart}`);
  return s;
}

export function holdInput(
  slot: Slot,
  opts: { key?: string | null; session?: Buffer | null; expiresAt?: Date } = {},
): CreateHoldInput {
  return {
    organizationId: ORG,
    locationId: LOC,
    timezone: TZ,
    slot,
    currency: 'EUR',
    source: 'web',
    items: [{ serviceId: SVC, priceCents: 2500, snapshot: { name: 'Taglio', price: 2500 } }],
    now: NOW,
    expiresAt: opts.expiresAt ?? new Date(NOW.getTime() + 10 * 60_000),
    sessionHash: opts.session ?? null,
    idempotencyKey: opts.key ?? null,
    createdByActor: { type: 'customer' },
  };
}
