import { computeAvailability, localDateOf, toZonedIso } from '@arthur/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createHold,
  findOrganizationId,
  getLocation,
  listLocations,
  listServices,
  loadAvailabilityInput,
  readMockSeed,
  seed,
} from '../src/index.ts';
import { createTestDb, type TestDb } from './setup.ts';

const DOC = new URL('../../../docs/21-dati-mock.md', import.meta.url).pathname;
const TZ = 'Europe/Rome';
const NOW = new Date('2026-11-02T08:00:00+01:00').getTime(); // lunedì: salone chiuso
const TUESDAY = '2026-11-03';

let db: TestDb;
let org: string;

beforeAll(async () => {
  db = await createTestDb();
  await seed(db.admin, readMockSeed(DOC));
  // Un'altra organizzazione con una sede: non deve mai comparire nelle letture di Arthur Style (RLS)
  await db.admin.query(`
    INSERT INTO organizations (id, slug, name) VALUES ('20000000-0000-0000-0000-000000000002', 'altro', 'Altro');
    INSERT INTO locations (organization_id, slug, name, country_code, timezone, vat_rate_bp, address)
      VALUES ('20000000-0000-0000-0000-000000000002', 'roma', 'Roma', 'IT', 'Europe/Rome', 2200, '{}');
  `);
  const id = await findOrganizationId(db.app, 'arthur-style');
  if (id === undefined) throw new Error('organizzazione del seed assente');
  org = id;
});

afterAll(async () => {
  await db.drop();
});

describe('seed da docs/21', () => {
  it('non si può applicare due volte', async () => {
    await expect(seed(db.admin, readMockSeed(DOC))).rejects.toThrow(/già presente/);
  });
});

describe('sedi', () => {
  it('elenco pubblico: solo le sedi attive dell’organizzazione (Malta è in bozza, Roma è di un’altra)', async () => {
    const list = await listLocations(db.app, org);
    expect(list.map((l) => l.slug)).toEqual(['firenze']);
    expect(list[0]).toMatchObject({ timezone: TZ, currency: 'EUR', countryCode: 'IT' });
  });

  it('dettaglio con contatti e orari validi oggi', async () => {
    const firenze = await getLocation(db.app, org, 'firenze', NOW);
    expect(firenze).toMatchObject({ phoneE164: '+393534918255', whatsappE164: '+393317545064' });
    expect(firenze?.hours).toHaveLength(5);
    expect(firenze?.hours[0]).toEqual({ weekday: 2, start: '09:00', end: '19:00', lastStart: '18:30' });
    expect(firenze?.hours.at(-1)).toEqual({ weekday: 6, start: '09:00', end: '18:00', lastStart: '17:30' });
  });

  it('una sede in bozza o di un’altra organizzazione non esiste', async () => {
    expect(await getLocation(db.app, org, 'malta', NOW)).toBeUndefined();
    expect(await getLocation(db.app, org, 'roma', NOW)).toBeUndefined();
  });
});

describe('catalogo', () => {
  it('categorie e servizi con durata percepita (somma delle fasi, buffer esclusi)', async () => {
    const cat = await listServices(db.app, org, 'firenze');
    expect(cat?.categories.map((c) => c.name['it'])).toEqual([
      'Taglio e piega',
      'Colore',
      'Hair Spa',
      'Acconciature',
      'Consulenza',
    ]);
    expect(cat?.services).toHaveLength(13);
    const taglio = cat?.services.find((s) => s.slug === 'taglio-piega');
    expect(taglio).toMatchObject({
      priceCents: 5500,
      priceIsFrom: true,
      onlineBookable: true,
      durationMin: 65,
    });
    expect(cat?.services.find((s) => s.slug === 'colore-radici')?.durationMin).toBe(105);
    expect(cat?.services.find((s) => s.slug === 'cheratina')?.onlineBookable).toBe(false);
  });

  it('sede inesistente → undefined', async () => {
    expect(await listServices(db.app, org, 'roma')).toBeUndefined();
  });
});

describe('disponibilità dai dati del database', () => {
  const load = (serviceSlugs: string[], from = TUESDAY, to = TUESDAY) =>
    loadAvailabilityInput(db.app, org, { locationSlug: 'firenze', serviceSlugs, from, to, now: NOW });

  it('martedì: primo inizio 09:00, ultimo entro le 18:30; lunedì chiuso', async () => {
    const r = await load(['taglio-piega'], '2026-11-02', TUESDAY);
    if (!r.ok) throw new Error(r.reason);
    const slots = computeAvailability(r.input);
    const starts = slots.map((s) => toZonedIso(s.customerStart, TZ));
    expect(starts.every((s) => s.startsWith(TUESDAY))).toBe(true);
    expect(starts[0]).toBe('2026-11-03T09:00:00+01:00');
    expect(starts.at(-1)! <= '2026-11-03T18:30:00+01:00').toBe(true);
    expect(r.input.staff).toHaveLength(2);
    expect(r.input.pools.map((p) => p.resourceIds.length).sort()).toEqual([2, 3]);
  });

  it('servizi non prenotabili online, archiviati o inesistenti → unknown-services', async () => {
    expect(await load(['cheratina'])).toEqual({
      ok: false,
      reason: 'unknown-services',
      slugs: ['cheratina'],
    });
    expect(await load(['taglio-piega', 'nope'])).toEqual({
      ok: false,
      reason: 'unknown-services',
      slugs: ['nope'],
    });
  });

  it('sede inesistente o di un’altra organizzazione → location-not-found', async () => {
    const r = await loadAvailabilityInput(db.app, org, {
      locationSlug: 'roma',
      serviceSlugs: ['taglio-piega'],
      from: TUESDAY,
      to: TUESDAY,
      now: NOW,
    });
    expect(r).toEqual({ ok: false, reason: 'location-not-found' });
  });

  it('le allocazioni attive tolgono lo slot: dopo due hold alle 09:00 non c’è più posto a quell’ora', async () => {
    for (let i = 0; i < 2; i++) {
      const r = await load(['taglio-piega']);
      if (!r.ok) throw new Error(r.reason);
      const slot = computeAvailability(r.input).find(
        (s) => toZonedIso(s.customerStart, TZ) === `${TUESDAY}T09:00:00+01:00`,
      );
      if (slot === undefined) throw new Error(`slot delle 09:00 assente al giro ${String(i)}`);
      const hold = await createHold(db.app, {
        organizationId: org,
        locationId: r.location.id,
        timezone: TZ,
        slot,
        items: r.services.map((s) => ({
          serviceId: s.id,
          priceCents: s.priceCents,
          snapshot: { slug: s.slug },
        })),
        currency: 'EUR',
        source: 'web',
        expiresAt: new Date(NOW + 600_000),
        sessionHash: null,
        idempotencyKey: null,
        createdByActor: { type: 'customer' },
      });
      expect(hold.ok).toBe(true);
    }
    const after = await load(['taglio-piega']);
    if (!after.ok) throw new Error(after.reason);
    expect(after.input.allocations.length).toBeGreaterThan(0);
    const nine = computeAvailability(after.input).filter(
      (s) => toZonedIso(s.customerStart, TZ) === `${TUESDAY}T09:00:00+01:00`,
    );
    expect(nine).toEqual([]); // due operatori, entrambi occupati
    expect(localDateOf(NOW, TZ)).toBe('2026-11-02');
  });
});
