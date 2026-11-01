import { randomUUID } from 'node:crypto';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HOLD_COOKIE } from '../src/security.ts';
import { createHarness, HUMAN, ORIGIN, PROBLEM, SITE, type Harness } from './harness.ts';

const NOW = new Date('2026-11-02T08:00:00+01:00').getTime(); // lunedì
const TUE = '2026-11-03';
const at = (hhmm: string, day = TUE) => `${day}T${hhmm}:00+01:00`;
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

interface Req {
  key?: string;
  cookie?: string | undefined;
  human?: string | null;
  origin?: string;
}

function postHold(body: Record<string, unknown>, o: Req = {}, target = app) {
  return target.inject({
    method: 'POST',
    url: '/v1/booking-holds',
    headers: {
      'idempotency-key': o.key ?? randomUUID(),
      ...(o.human === null ? {} : { 'cf-turnstile-response': o.human ?? HUMAN }),
      ...(o.origin === undefined ? {} : { origin: o.origin }),
    },
    ...(o.cookie === undefined ? {} : { cookies: { [HOLD_COOKIE]: o.cookie } }),
    payload: body,
  });
}
const holdBody = (start: string, services = ['taglio-piega']) => ({ location: 'firenze', services, start });
const cookieOf = (r: LightMyRequestResponse) => r.cookies.find((c) => c.name === HOLD_COOKIE)?.value;
const json = (r: LightMyRequestResponse) => r.json<Record<string, unknown>>();
const statusOf = async (id: string) =>
  (await h.db.admin.query<{ status: string }>('SELECT status FROM bookings WHERE id = $1', [id])).rows[0]
    ?.status;

/** Hold riuscito: restituisce id e cookie della sessione. */
async function hold(start: string, cookie?: string): Promise<{ id: string; cookie: string }> {
  const r = await postHold(holdBody(start), { cookie });
  expect(r.statusCode, r.body).toBe(201);
  return { id: r.json<{ id: string }>().id, cookie: cookie ?? cookieOf(r)! };
}

describe('POST /v1/booking-holds', () => {
  it('201: hold di 10 minuti, cookie __Host-hold sicuro, prezzi e orari calcolati dal server', async () => {
    const r = await postHold(holdBody(at('09:00')));
    expect(r.statusCode).toBe(201);
    expect(r.headers['cache-control']).toBe('no-store');
    expect(json(r)).toMatchObject({
      status: 'held',
      location: 'firenze',
      start: at('09:00'),
      end: at('10:05'),
      expiresAt: '2026-11-02T08:10:00+01:00',
      services: [{ slug: 'taglio-piega', price: { currency: 'EUR' } }],
    });
    const c = r.cookies.find((x) => x.name === HOLD_COOKIE);
    expect(c).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax', path: '/' });
    expect(c).not.toHaveProperty('domain');
    expect(JSON.stringify(json(r))).not.toMatch(/staff|resource|session/i);
  });

  it('Turnstile mancante o sbagliato → 403; Idempotency-Key mancante → 400', async () => {
    for (const human of [null, 'token-bot']) {
      const r = await postHold(holdBody(at('09:15')), { human });
      expect(r.statusCode).toBe(403);
      expect(r.headers['content-type']).toBe(PROBLEM);
      expect(json(r)).toMatchObject({ type: `${ORIGIN}/problems/human-check-failed` });
    }
    const r = await app.inject({
      method: 'POST',
      url: '/v1/booking-holds',
      headers: { 'cf-turnstile-response': HUMAN },
      payload: holdBody(at('09:15')),
    });
    expect(r.statusCode).toBe(400);
    expect(Object.keys(r.json<{ fieldErrors: object }>().fieldErrors)).toContain('idempotency-key');
  });

  it('stessa Idempotency-Key: stessa risposta alla stessa sessione (senza Turnstile), 422 alle altre', async () => {
    const key = randomUUID();
    const first = await postHold(holdBody(at('09:30')), { key });
    const cookie = cookieOf(first)!;
    const again = await postHold(holdBody(at('09:30')), { key, cookie, human: null });
    expect(again.statusCode).toBe(201);
    expect(json(again)).toEqual(json(first));
    const n = await h.db.admin.query('SELECT 1 FROM bookings WHERE idempotency_key = $1', [key]);
    expect(n.rowCount).toBe(1);
    const stranger = await postHold(holdBody(at('09:30')), { key });
    expect(stranger.statusCode).toBe(422);
    expect(json(stranger)).toMatchObject({ type: `${ORIGIN}/problems/idempotency-key-reused` });
  });

  it('orario occupato o fuori griglia → 409 slot-taken con le 3 alternative più vicine', async () => {
    await hold(at('11:00'));
    await hold(at('11:00')); // due operatori: ora sono entrambi occupati alle 11
    for (const start of [at('11:00'), at('11:07')]) {
      const r = await postHold(holdBody(start));
      expect(r.statusCode).toBe(409);
      const body = r.json<{ type: string; alternatives: { start: string }[] }>();
      expect(body.type).toBe(`${ORIGIN}/problems/slot-taken`);
      expect(body.alternatives).toHaveLength(3);
      const starts = body.alternatives.map((a) => a.start);
      expect(starts).toEqual([...starts].sort());
      expect(starts).not.toContain(at('11:00'));
    }
  });

  it('la stessa sessione ha un solo hold: il nuovo sostituisce il vecchio', async () => {
    const a = await hold(at('12:15'));
    const b = await hold(at('12:45'), a.cookie);
    expect(await statusOf(a.id)).toBe('cancelled');
    expect(await statusOf(b.id)).toBe('held');
  });

  it('servizio solo su consulenza → 400; sede inesistente → 404; scrittura da un’origine non ammessa → 403', async () => {
    expect((await postHold(holdBody(at('13:00'), ['cheratina']))).statusCode).toBe(400);
    expect((await postHold({ ...holdBody(at('13:00')), location: 'roma' })).statusCode).toBe(404);
    const evil = await postHold(holdBody(at('13:00')), { origin: 'https://evil.example' });
    expect(evil.statusCode).toBe(403);
    expect(json(evil)).toMatchObject({ type: `${ORIGIN}/problems/forbidden-origin` });
    expect((await postHold(holdBody(at('13:00')), { origin: SITE })).statusCode).toBe(201);
  });

  it('rate limit per IP sugli hold → 429', async () => {
    const limited = await h.build({ rateLimits: { ...OPEN, holdsPerHour: 1 } });
    try {
      expect((await postHold(holdBody(at('14:00')), {}, limited)).statusCode).toBe(201);
      expect((await postHold(holdBody(at('14:15')), {}, limited)).statusCode).toBe(429);
    } finally {
      await limited.close();
    }
  });
});

describe('DELETE /v1/booking-holds/{id}', () => {
  it('solo la sessione proprietaria (403 alle altre), idempotente, 404 se non esiste', async () => {
    const { id, cookie } = await hold(at('15:00'));
    const del = (c?: string) =>
      app.inject({
        method: 'DELETE',
        url: `/v1/booking-holds/${id}`,
        ...(c ? { cookies: { [HOLD_COOKIE]: c } } : {}),
      });
    expect((await del()).statusCode).toBe(403);
    expect((await del('valore-falso.firma')).statusCode).toBe(403);
    expect((await del(cookie)).statusCode).toBe(204);
    expect(await statusOf(id)).toBe('cancelled');
    expect((await del(cookie)).statusCode).toBe(204);
    const missing = await app.inject({
      method: 'DELETE',
      url: `/v1/booking-holds/${randomUUID()}`,
      cookies: { [HOLD_COOKIE]: cookie },
    });
    expect(missing.statusCode).toBe(404);
  });
});

// ───────────────────────────── OTP e conferma ─────────────────────────────

const requestOtp = (email: string, human: string | null = HUMAN) =>
  app.inject({
    method: 'POST',
    url: '/v1/otp',
    headers: human === null ? {} : { 'cf-turnstile-response': human },
    payload: { email, locale: 'it' },
  });
const verifyOtp = (email: string, code: string) =>
  app.inject({ method: 'POST', url: '/v1/otp/verify', payload: { email, code } });
const lastCode = (to: string) => {
  const m = h.mails.filter((x) => x.to === to).at(-1);
  return /\b(\d{6})\b/.exec(m?.text ?? '')?.[1];
};

describe('OTP via email', () => {
  it('risposta sempre uguale (anche oltre il limite per indirizzo); codice solo nell’email', async () => {
    const email = 'anna@example.com';
    const bodies: string[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await requestOtp(i === 0 ? '  Anna@Example.com ' : email);
      expect(r.statusCode).toBe(202);
      bodies.push(r.body);
    }
    expect(new Set(bodies).size).toBe(1);
    expect(bodies[0]).not.toMatch(/\d{6}/);
    expect(h.mails.filter((m) => m.to === email)).toHaveLength(3); // il 4° non parte (max 3 in 15')
    expect((await requestOtp(email, null)).statusCode).toBe(403);
  });

  it('codice sbagliato → 401; giusto → token monouso; dopo 5 errori → 429 otp-locked', async () => {
    const email = 'bruno@example.com';
    await requestOtp(email);
    const code = lastCode(email)!;
    const wrong = code === '000000' ? '111111' : '000000';
    const bad = await verifyOtp(email, wrong);
    expect(bad.statusCode).toBe(401);
    expect(json(bad)).toMatchObject({ type: `${ORIGIN}/problems/otp-invalid` });
    const ok = await verifyOtp(email, code);
    expect(ok.statusCode).toBe(200);
    expect(ok.json<{ verificationToken: string }>().verificationToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const email2 = 'carla@example.com';
    await requestOtp(email2);
    const code2 = lastCode(email2)!;
    const wrong2 = code2 === '000000' ? '111111' : '000000';
    const statuses = [];
    for (let i = 0; i < 5; i++) statuses.push((await verifyOtp(email2, wrong2)).statusCode);
    expect(statuses).toEqual([401, 401, 401, 401, 429]);
    expect((await verifyOtp(email2, code2)).statusCode).toBe(429);
  });
});

describe('POST /v1/booking-holds/{id}/confirm', () => {
  async function verifiedToken(email: string): Promise<string> {
    await requestOtp(email);
    const r = await verifyOtp(email, lastCode(email)!);
    return r.json<{ verificationToken: string }>().verificationToken;
  }
  const confirm = (id: string, cookie: string | undefined, body: Record<string, unknown>) =>
    app.inject({
      method: 'POST',
      url: `/v1/booking-holds/${id}/confirm`,
      ...(cookie === undefined ? {} : { cookies: { [HOLD_COOKIE]: cookie } }),
      payload: body,
    });
  const customer = { firstName: 'Diana', lastName: 'Verdi', email: 'diana@example.com', locale: 'it' };

  it('flusso completo: hold → OTP → conferma 201 con token di gestione; una seconda conferma → 409', async () => {
    const { id, cookie } = await hold(at('16:00'));
    const token = await verifiedToken(customer.email);
    const body = { verificationToken: token, customer, acceptPrivacy: true, marketingConsent: false };

    expect((await confirm(id, undefined, body)).statusCode).toBe(403); // senza cookie della sessione
    expect((await confirm(id, cookie, { ...body, acceptPrivacy: false })).statusCode).toBe(400);
    const wrongToken = await confirm(id, cookie, { ...body, verificationToken: 'x'.repeat(43) });
    expect(wrongToken.statusCode).toBe(401);
    expect(json(wrongToken)).toMatchObject({ type: `${ORIGIN}/problems/otp-required` });

    const r = await confirm(id, cookie, { ...body, note: 'Capelli molto lunghi' });
    expect(r.statusCode).toBe(201);
    const out = r.json<{ booking: Record<string, unknown>; manageToken: string }>();
    expect(out.booking).toMatchObject({ id, status: 'confirmed', start: at('16:00') });
    expect(out.manageToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const row = await h.db.admin.query<{ customer_note: string; manage_token_hash: Buffer }>(
      'SELECT customer_note, manage_token_hash FROM bookings WHERE id = $1',
      [id],
    );
    expect(row.rows[0]?.customer_note).toBe('Capelli molto lunghi');
    expect(row.rows[0]?.manage_token_hash.toString('base64url')).not.toBe(out.manageToken);

    const twice = await confirm(id, cookie, body);
    expect(twice.statusCode).toBe(409);
    expect(json(twice)).toMatchObject({ type: `${ORIGIN}/problems/not-held` });
  });

  it('hold scaduto → 410; hold di un’altra sessione → 403', async () => {
    const mine = await hold(at('17:00'));
    const theirs = await hold(at('17:30'));
    const token = await verifiedToken('elena@example.com');
    const body = {
      verificationToken: token,
      customer: { ...customer, email: 'elena@example.com' },
      acceptPrivacy: true,
    };
    expect((await confirm(theirs.id, mine.cookie, body)).statusCode).toBe(403);
    const later = await h.build({ rateLimits: OPEN, clock: { now: () => NOW + 11 * 60_000 } });
    try {
      const r = await later.inject({
        method: 'POST',
        url: `/v1/booking-holds/${mine.id}/confirm`,
        cookies: { [HOLD_COOKIE]: mine.cookie },
        payload: body,
      });
      expect(r.statusCode).toBe(410);
    } finally {
      await later.close();
    }
  });
});
