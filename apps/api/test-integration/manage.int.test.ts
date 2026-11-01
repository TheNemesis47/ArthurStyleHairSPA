import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bookViaApi, createHarness, HUMAN, ORIGIN, type Harness } from './harness.ts';

const NOW = new Date('2026-11-02T08:00:00+01:00').getTime(); // lunedì
const FAR = '2026-11-10'; // martedì tra 8 giorni: disdetta libera (finestra di 4 giorni)
const NEAR = '2026-11-04'; // mercoledì tra 2 giorni: solo telefono o WhatsApp
const at = (hhmm: string, day: string) => `${day}T${hhmm}:00+01:00`;
const OPEN = {
  holdsPerHour: 1000,
  otpRequestsPer10Min: 1000,
  otpVerifiesPer10Min: 1000,
  writesPer10Min: 1000,
};

let h: Harness;
let app: FastifyInstance;

beforeAll(async () => {
  h = await createHarness(NOW);
  app = await h.build({ rateLimits: OPEN });
});
afterAll(async () => {
  await app.close();
  await h.db.drop();
});

const book = (start: string) => bookViaApi(app, h.mails, start, `${randomUUID()}@example.com`);
const manage = (token: string, path = '', method: 'GET' | 'POST' = 'GET', payload?: object) =>
  app.inject({ method, url: `/v1/manage/${token}${path}`, ...(payload ? { payload } : {}) });
type Managed = {
  status: string;
  start: string;
  canCancel: boolean;
  canReschedule: boolean;
  cancelUntil: string;
};

describe('GET /v1/manage/{token}', () => {
  it('prenotazione, finestre di modifica e contatti; no-referrer; token sconosciuto → 404, malformato → 400', async () => {
    const { manageToken } = await book(at('09:00', FAR));
    const r = await manage(manageToken);
    expect(r.statusCode).toBe(200);
    expect(r.headers['referrer-policy']).toBe('no-referrer');
    expect(r.headers['cache-control']).toBe('no-store');
    expect(r.json()).toMatchObject({
      status: 'confirmed',
      start: at('09:00', FAR),
      canCancel: true,
      canReschedule: true,
      cancelUntil: '2026-11-06T09:00:00+01:00',
      contact: { phone: '+393534918255', whatsapp: '+393317545064' },
    });
    expect((await manage('A'.repeat(43))).statusCode).toBe(404);
    expect((await manage('troppo-corto')).statusCode).toBe(400);
  });

  it('file .ics: RFC 5545 con CRLF, orari in UTC, testi nella lingua richiesta', async () => {
    const { id, manageToken } = await book(at('10:00', FAR));
    const r = await manage(manageToken, '/ics');
    expect(r.statusCode).toBe(200);
    expect(r.headers['content-type']).toBe('text/calendar; charset=utf-8');
    expect(r.body).toContain('\r\nDTSTART:20261110T090000Z\r\n');
    expect(r.body).toContain(`UID:${id}@arthur-style`);
    expect(r.body).toContain('STATUS:CONFIRMED');
    const unfold = (body: string) => body.replace(/\r\n /g, ''); // RFC 5545: righe piegate a 75 ottetti
    expect(unfold(r.body)).toContain('email di conferma');
    const en = await app.inject({
      method: 'GET',
      url: `/v1/manage/${manageToken}/ics`,
      headers: { 'accept-language': 'en-GB,en;q=0.9' },
    });
    expect(unfold(en.body)).toContain('confirmation email');
  });
});

describe('POST /v1/manage/{token}/reschedule', () => {
  it('sposta in modo atomico, anche sovrapponendosi a se stessa', async () => {
    const { manageToken } = await book(at('11:00', FAR));
    const r = await manage(manageToken, '/reschedule', 'POST', { start: at('11:30', FAR) });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json<Managed>().start).toBe(at('11:30', FAR));
    const view = await manage(manageToken);
    expect(view.json<Managed>().start).toBe(at('11:30', FAR));
  });

  it('orario occupato → 409 con alternative e prenotazione invariata; finestra superata → 422', async () => {
    const { manageToken } = await book(at('14:00', FAR));
    // occupa entrambi gli operatori alle 16:00 con due hold di altre sessioni
    for (let i = 0; i < 2; i++) {
      const hold = await app.inject({
        method: 'POST',
        url: '/v1/booking-holds',
        headers: { 'idempotency-key': randomUUID(), 'cf-turnstile-response': HUMAN },
        payload: { location: 'firenze', services: ['taglio-piega'], start: at('16:00', FAR) },
      });
      expect(hold.statusCode).toBe(201);
    }
    const r = await manage(manageToken, '/reschedule', 'POST', { start: at('16:00', FAR) });
    expect(r.statusCode).toBe(409);
    expect(r.json()).toMatchObject({ type: `${ORIGIN}/problems/slot-taken` });
    expect(r.json<{ alternatives: unknown[] }>().alternatives).toHaveLength(3);
    expect((await manage(manageToken)).json<Managed>().start).toBe(at('14:00', FAR));

    const near = await book(at('10:00', NEAR));
    const late = await manage(near.manageToken, '/reschedule', 'POST', { start: at('11:00', NEAR) });
    expect(late.statusCode).toBe(422);
    expect(late.json()).toMatchObject({ type: `${ORIGIN}/problems/outside-policy` });
  });
});

describe('POST /v1/manage/{token}/cancel', () => {
  it('entro la finestra → 200 cancelled; ripetuta → 409; poi niente spostamenti né disdette', async () => {
    const { manageToken } = await book(at('17:30', FAR)); // alle 16–17:05 i due operatori sono occupati
    const r = await manage(manageToken, '/cancel', 'POST', { reason: 'Imprevisto' });
    expect(r.statusCode).toBe(200);
    expect(r.json<Managed>()).toMatchObject({ status: 'cancelled', canCancel: false, canReschedule: false });
    expect((await manage(manageToken, '/cancel', 'POST', {})).statusCode).toBe(409);
    expect((await manage(manageToken, '/reschedule', 'POST', { start: at('18:00', FAR) })).statusCode).toBe(
      409,
    );
    expect((await manage(manageToken, '/ics')).body).toContain('STATUS:CANCELLED');
  });

  it('a meno di 4 giorni → 422 outside-policy: si chiama il salone', async () => {
    const { manageToken } = await book(at('15:00', NEAR));
    const view = await manage(manageToken);
    expect(view.json<Managed>()).toMatchObject({ canCancel: false, canReschedule: false });
    const r = await manage(manageToken, '/cancel', 'POST', {});
    expect(r.statusCode).toBe(422);
  });
});
