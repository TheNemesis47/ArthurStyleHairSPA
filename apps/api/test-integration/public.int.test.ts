import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fixedClock } from '@arthur/core';
import { findOrganizationId, readMockSeed, seed } from '@arthur/db';
import { createTestDb, type TestDb } from '@arthur/db/testing';
import { buildApp } from '../src/app.ts';

const DOC = new URL('../../../docs/21-dati-mock.md', import.meta.url).pathname;
const ORIGIN = 'https://api.test.invalid';
const NOW = new Date('2026-11-02T08:00:00+01:00').getTime(); // lunedì, salone chiuso
const PROBLEM = 'application/problem+json; charset=utf-8';

let db: TestDb;
let app: FastifyInstance;
let organizationId: string;

beforeAll(async () => {
  db = await createTestDb();
  await seed(db.admin, readMockSeed(DOC));
  const id = await findOrganizationId(db.app, 'arthur-style');
  if (id === undefined) throw new Error('seed mancante');
  organizationId = id;
  // L'API usa il ruolo app_api, soggetto a RLS, come in produzione
  app = await buildApp({ pool: db.app, organizationId, clock: fixedClock(NOW), publicOrigin: ORIGIN });
});

afterAll(async () => {
  await app.close();
  await db.drop();
});

const get = (url: string) => app.inject({ method: 'GET', url });

describe('sedi', () => {
  it('GET /v1/locations: solo Firenze (Malta è in bozza), cache 5 minuti', async () => {
    const r = await get('/v1/locations');
    expect(r.statusCode).toBe(200);
    expect(r.headers['cache-control']).toBe('public, max-age=300');
    expect(r.json()).toEqual({
      locations: [
        {
          slug: 'firenze',
          name: 'Arthur Style · Hair Spa Firenze',
          status: 'active',
          countryCode: 'IT',
          timezone: 'Europe/Rome',
          currency: 'EUR',
          defaultLocale: 'it',
          opensOn: null,
        },
      ],
    });
  });

  it('GET /v1/locations/firenze: contatti e orari; nessun id interno', async () => {
    const r = await get('/v1/locations/firenze');
    expect(r.statusCode).toBe(200);
    const body = r.json<Record<string, unknown>>();
    expect(body).toMatchObject({ phone: '+393534918255', whatsapp: '+393317545064' });
    expect(body['hours']).toHaveLength(5);
    expect(body).not.toHaveProperty('id');
  });

  it('sede in bozza o inesistente → 404 RFC 9457', async () => {
    for (const slug of ['malta', 'roma']) {
      const r = await get(`/v1/locations/${slug}`);
      expect(r.statusCode).toBe(404);
      expect(r.headers['content-type']).toBe(PROBLEM);
      expect(r.json()).toEqual({
        type: `${ORIGIN}/problems/not-found`,
        title: 'Risorsa inesistente',
        status: 404,
      });
    }
  });

  it('slug malformato → 400 validation con fieldErrors', async () => {
    const r = await get('/v1/locations/FIRENZE');
    expect(r.statusCode).toBe(400);
    const body = r.json<{ type: string; fieldErrors: Record<string, string[]> }>();
    expect(body.type).toBe(`${ORIGIN}/problems/validation`);
    expect(body.fieldErrors['slug']?.length).toBeGreaterThan(0);
  });
});

describe('catalogo', () => {
  it('GET /v1/locations/firenze/services: prezzi in centesimi, durata percepita, nessuna fase interna', async () => {
    const r = await get('/v1/locations/firenze/services');
    expect(r.statusCode).toBe(200);
    const body = r.json<{ categories: unknown[]; services: Record<string, unknown>[] }>();
    expect(body.categories).toHaveLength(5);
    expect(body.services).toHaveLength(13);
    expect(body.services.find((s) => s['slug'] === 'colore-radici')).toMatchObject({
      price: { amountCents: 6500, currency: 'EUR', isFrom: true },
      durationMin: 105,
      onlineBookable: true,
    });
    expect(JSON.stringify(body)).not.toMatch(/steps|staff_busy|bufferAfter/);
  });
});

describe('disponibilità', () => {
  const url = (q: string) => `/v1/availability?${q}`;

  it('martedì per taglio + piega: dalle 09:00 alle 18:30, ISO con offset, nessun dato interno', async () => {
    const r = await get(url('location=firenze&services=taglio-piega&from=2026-11-03&to=2026-11-03'));
    expect(r.statusCode).toBe(200);
    expect(r.headers['cache-control']).toBe('no-store');
    const body = r.json<{ slots: { start: string; end: string }[]; timezone: string }>();
    expect(body.timezone).toBe('Europe/Rome');
    expect(body.slots[0]).toEqual({ start: '2026-11-03T09:00:00+01:00', end: '2026-11-03T10:05:00+01:00' });
    expect(body.slots.at(-1)!.start <= '2026-11-03T18:30:00+01:00').toBe(true);
    // un orario compare una sola volta anche se due operatori sono liberi
    expect(new Set(body.slots.map((s) => s.start)).size).toBe(body.slots.length);
    for (const s of body.slots) expect(Object.keys(s)).toEqual(['start', 'end']);
  });

  it('più servizi in sequenza e lunedì chiuso', async () => {
    const r = await get(
      url('location=firenze&services=colore-radici,ristrutturante&from=2026-11-02&to=2026-11-03'),
    );
    expect(r.statusCode).toBe(200);
    const slots = r.json<{ slots: { start: string }[] }>().slots;
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.start.startsWith('2026-11-03'))).toBe(true);
  });

  it.each([
    ['manca services', 'location=firenze&from=2026-11-03&to=2026-11-03', 'services'],
    ['data inesistente', 'location=firenze&services=taglio-piega&from=2026-02-30&to=2026-03-01', 'from'],
    ['to prima di from', 'location=firenze&services=taglio-piega&from=2026-11-05&to=2026-11-03', 'to'],
    ['più di 31 giorni', 'location=firenze&services=taglio-piega&from=2026-11-03&to=2026-12-31', 'to'],
    ['servizio ripetuto', 'location=firenze&services=gloss,gloss&from=2026-11-03&to=2026-11-03', 'services'],
    [
      'servizio solo su consulenza',
      'location=firenze&services=cheratina&from=2026-11-03&to=2026-11-03',
      'services',
    ],
    ['servizio inesistente', 'location=firenze&services=nope&from=2026-11-03&to=2026-11-03', 'services'],
  ])('%s → 400 validation su "%s"', async (_name, q, field) => {
    const r = await get(url(q));
    expect(r.statusCode).toBe(400);
    expect(r.headers['content-type']).toBe(PROBLEM);
    const body = r.json<{ type: string; fieldErrors: Record<string, string[]> }>();
    expect(body.type).toBe(`${ORIGIN}/problems/validation`);
    expect(Object.keys(body.fieldErrors)).toContain(field);
  });

  it('sede inesistente → 404', async () => {
    const r = await get(url('location=roma&services=taglio-piega&from=2026-11-03&to=2026-11-03'));
    expect(r.statusCode).toBe(404);
  });
});

describe('sicurezza HTTP', () => {
  it('header di sicurezza, niente x-powered-by, header RateLimit', async () => {
    const r = await get('/v1/locations');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['content-security-policy']).toContain("default-src 'none'");
    expect(r.headers['x-powered-by']).toBeUndefined();
    expect(r.headers['ratelimit-limit']).toBe('300');
  });

  it('rotta inesistente → 404 RFC 9457', async () => {
    const r = await get('/v1/nope');
    expect(r.statusCode).toBe(404);
    expect(r.json()).toMatchObject({ type: `${ORIGIN}/problems/not-found` });
  });

  it('rate limit sulla disponibilità: oltre il limite 429 con Retry-After', async () => {
    const limited = await buildApp({
      pool: db.app,
      organizationId,
      clock: fixedClock(NOW),
      publicOrigin: ORIGIN,
      rateLimits: { global: 100, availability: 2 },
    });
    try {
      const q = '/v1/availability?location=firenze&services=gloss&from=2026-11-03&to=2026-11-03';
      expect((await limited.inject(q)).statusCode).toBe(200);
      expect((await limited.inject(q)).statusCode).toBe(200);
      const r = await limited.inject(q);
      expect(r.statusCode).toBe(429);
      expect(r.headers['retry-after']).toBeDefined();
      expect(r.json()).toMatchObject({ type: `${ORIGIN}/problems/rate-limited`, status: 429 });
    } finally {
      await limited.close();
    }
  });

  it('health: live e ready (database raggiungibile)', async () => {
    expect((await get('/health/live')).json()).toEqual({ status: 'ok' });
    expect((await get('/health/ready')).json()).toEqual({ status: 'ok' });
  });

  it('una rotta senza policy di autorizzazione blocca l’avvio', async () => {
    const guarded = await buildApp({
      pool: db.app,
      organizationId,
      clock: fixedClock(NOW),
      publicOrigin: ORIGIN,
    });
    expect(() => guarded.get('/v1/segreta', () => 'no')).toThrow(/senza policy di autorizzazione/);
    await guarded.close();
  });
});
