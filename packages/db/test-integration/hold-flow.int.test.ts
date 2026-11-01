import { createHmac, randomUUID } from 'node:crypto';
import { computeAvailability, toZonedIso } from '@arthur/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  BookingRejected,
  confirmHold,
  createHold,
  findByIdempotencyKey,
  findOrganizationId,
  getHold,
  issueContactVerification,
  loadAvailabilityInput,
  readMockSeed,
  releaseHold,
  seed,
  sha256,
  verifyContactCode,
} from '../src/index.ts';
import { createTestDb, type TestDb } from './setup.ts';

const DOC = new URL('../../../docs/21-dati-mock.md', import.meta.url).pathname;
const TZ = 'Europe/Rome';
const NOW = new Date('2026-11-02T08:00:00+01:00').getTime(); // lunedì
const TUESDAY = '2026-11-03';
const MIN = 60_000;

let db: TestDb;
let org: string;

beforeAll(async () => {
  db = await createTestDb();
  await seed(db.admin, readMockSeed(DOC));
  const id = await findOrganizationId(db.app, 'arthur-style');
  if (id === undefined) throw new Error('organizzazione del seed assente');
  org = id;
});
afterAll(async () => {
  await db.drop();
});

const session = (name: string) => sha256(`sessione-${name}`);

async function load(now: number, holdSessionHash?: Buffer) {
  const r = await loadAvailabilityInput(db.app, org, {
    locationSlug: 'firenze',
    serviceSlugs: ['gloss'],
    from: TUESDAY,
    to: TUESDAY,
    now,
    ...(holdSessionHash === undefined ? {} : { ignore: { holdSessionHash } }),
  });
  if (!r.ok) throw new Error(r.reason);
  return r;
}

/** Quanti operatori/combinazioni restano liberi a quell'ora (il motore restituisce uno slot per inizio). */
async function freeAt(time: string, now = NOW, holdSessionHash?: Buffer): Promise<boolean> {
  const r = await load(now, holdSessionHash);
  return computeAvailability(r.input).some(
    (s) => toZonedIso(s.customerStart, TZ) === `${TUESDAY}T${time}:00+01:00`,
  );
}

async function hold(
  time: string,
  opts: { session?: Buffer | null; now?: number; ttlMin?: number; key?: string } = {},
): Promise<string> {
  const now = opts.now ?? NOW;
  const r = await load(now, opts.session ?? undefined);
  const slot = computeAvailability(r.input).find(
    (s) => toZonedIso(s.customerStart, TZ) === `${TUESDAY}T${time}:00+01:00`,
  );
  if (slot === undefined) throw new Error(`nessuno slot alle ${time}`);
  const res = await createHold(db.app, {
    organizationId: org,
    locationId: r.location.id,
    timezone: TZ,
    slot,
    items: r.services.map((s) => ({
      serviceId: s.id,
      priceCents: s.priceCents,
      snapshot: { slug: s.slug, name: s.name },
    })),
    currency: 'EUR',
    source: 'web',
    now: new Date(now),
    expiresAt: new Date(now + (opts.ttlMin ?? 10) * MIN),
    sessionHash: opts.session ?? null,
    idempotencyKey: opts.key ?? null,
    createdByActor: { type: 'customer' },
  });
  if (!res.ok) throw new Error(res.reason);
  return res.bookingId;
}

const statusOf = async (id: string) =>
  (await db.admin.query<{ status: string }>('SELECT status FROM bookings WHERE id = $1', [id])).rows[0]
    ?.status;

/** Occupa entrambi gli operatori a un orario, così il test vede subito se l'orario si libera. */
async function fillBoth(time: string, opts: Parameters<typeof hold>[1] = {}): Promise<string[]> {
  return [await hold(time, opts), await hold(time, { ...opts, session: null })];
}

describe('hold: una sessione, un hold (docs/06 E10)', () => {
  it('il nuovo hold della stessa sessione sostituisce il precedente e ne libera le risorse', async () => {
    const s = session('A');
    const first = await hold('10:00', { session: s });
    const second = await hold('11:00', { session: s });
    expect(await statusOf(first)).toBe('cancelled');
    expect(await statusOf(second)).toBe('held');
    const active = await db.admin.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM allocations WHERE booking_id = $1 AND active',
      [first],
    );
    expect(active.rows[0]?.n).toBe(0);
  });

  it("la sessione vede come libero l'orario del proprio hold (lo sostituirà), le altre no", async () => {
    const s = session('B');
    const [mine] = await fillBoth('12:00', { session: s });
    expect(await freeAt('12:00')).toBe(false);
    expect(await freeAt('12:00', NOW, s)).toBe(true);
    // e può davvero riprenderlo: il vecchio hold passa a 'cancelled' nella stessa transazione
    const again = await hold('12:00', { session: s });
    expect(await statusOf(mine!)).toBe('cancelled');
    expect(await statusOf(again)).toBe('held');
  });

  it('un hold scaduto ma non ripulito non occupa l’orario e viene fatto scadere da chi lo riprende', async () => {
    const stale = await fillBoth('14:00', { ttlMin: 5 });
    const later = NOW + 6 * MIN;
    expect(await freeAt('14:00', NOW)).toBe(false);
    expect(await freeAt('14:00', later)).toBe(true);
    await hold('14:00', { now: later });
    const statuses = await Promise.all(stale.map(statusOf));
    expect(statuses).toContain('expired');
  });

  it('getHold e findByIdempotencyKey restituiscono la stessa vista; gli altri tenant non la vedono', async () => {
    const key = randomUUID();
    const id = await hold('15:00', { session: session('C'), key });
    const view = await getHold(db.app, org, id);
    expect(view).toMatchObject({ id, status: 'held', locationSlug: 'firenze', currency: 'EUR' });
    expect(view?.items.map((i) => i.slug)).toEqual(['gloss']);
    expect((await findByIdempotencyKey(db.app, org, 'firenze', key))?.id).toBe(id);
    expect(await getHold(db.app, '20000000-0000-0000-0000-000000000099', id)).toBeUndefined();
  });
});

describe('rilascio dell’hold', () => {
  it('solo la sessione proprietaria; idempotente; mai su una prenotazione confermata', async () => {
    const s = session('D');
    const id = await hold('16:00', { session: s });
    const rel = (sessionHash: Buffer | null) =>
      releaseHold(db.app, { organizationId: org, bookingId: id, sessionHash, now: new Date(NOW + MIN) });
    expect(await rel(session('altra'))).toBe('not-owned');
    expect(await rel(null)).toBe('not-owned');
    expect(await rel(s)).toBe('released');
    expect(await statusOf(id)).toBe('cancelled');
    expect(await rel(s)).toBe('released');
    expect(
      await releaseHold(db.app, {
        organizationId: org,
        bookingId: randomUUID(),
        sessionHash: s,
        now: new Date(NOW),
      }),
    ).toBe('not-found');
  });
});

// ───────────────────────────── OTP ─────────────────────────────

const SECRET = 'segreto-di-test-per-hmac-0123456789';
const hmac = (id: string, code: string) => createHmac('sha256', SECRET).update(`${id}:${code}`).digest();
const LIMITS = { perWindow: 3, windowMin: 15, perDay: 10 };

async function issue(email: string, code: string, now = NOW) {
  const id = randomUUID();
  const r = await issueContactVerification(db.app, {
    organizationId: org,
    id,
    destination: email,
    codeHash: hmac(id, code),
    ipHash: null,
    now: new Date(now),
    expiresAt: new Date(now + 10 * MIN),
    limits: LIMITS,
  });
  return r;
}

function verify(email: string, code: string, token = randomUUID(), now = NOW + MIN) {
  return verifyContactCode(db.app, {
    organizationId: org,
    destination: email,
    now: new Date(now),
    maxAttempts: 5,
    matches: (id, stored) => hmac(id, code).equals(stored),
    tokenHash: sha256(token),
    tokenExpiresAt: new Date(now + 15 * MIN),
  });
}

describe('OTP via email', () => {
  it('codice giusto → verified; codice sbagliato → invalid; dopo 5 errori → locked anche col codice giusto', async () => {
    expect(await issue('Uno@Example.com', '123456')).toBe('issued');
    for (let i = 0; i < 4; i++) expect(await verify('uno@example.com', '000000')).toBe('invalid');
    expect(await verify('uno@example.com', '000000')).toBe('locked');
    expect(await verify('uno@example.com', '123456')).toBe('locked');

    expect(await issue('uno@example.com', '654321')).toBe('issued'); // il nuovo codice riparte da zero
    expect(await verify('UNO@example.com', '654321')).toBe('verified');
    expect(await verify('uno@example.com', '654321')).toBe('invalid'); // già usato
  });

  it('un nuovo codice annulla il precedente; il codice scade dopo 10 minuti; nessun codice → invalid', async () => {
    await issue('due@example.com', '111111');
    await issue('due@example.com', '222222');
    expect(await verify('due@example.com', '111111')).toBe('invalid');
    expect(await verify('due@example.com', '222222', randomUUID(), NOW + 11 * MIN)).toBe('invalid');
    expect(await verify('nessuno@example.com', '123456')).toBe('invalid');
  });

  it('limiti per destinatario: max 3 in 15 minuti, poi throttled; in DB nessun codice in chiaro', async () => {
    for (let i = 0; i < 3; i++)
      expect(await issue('tre@example.com', '333333', NOW + i * MIN)).toBe('issued');
    expect(await issue('tre@example.com', '333333', NOW + 4 * MIN)).toBe('throttled');
    expect(await issue('tre@example.com', '333333', NOW + 20 * MIN)).toBe('issued');
    const rows = await db.admin.query<{ code_hash: Buffer }>(
      "SELECT code_hash FROM contact_verifications WHERE destination = 'tre@example.com'",
    );
    for (const r of rows.rows) expect(r.code_hash.toString('utf8')).not.toContain('333333');
  });
});

describe('conferma con token di verifica', () => {
  const customer = { firstName: 'Giulia', lastName: 'Bianchi', email: 'giulia@example.com', locale: 'it' };

  it('il token è monouso, vale solo per la sua email e resta valido se la conferma fallisce', async () => {
    const s = session('E');
    const token = randomUUID();
    await issue(customer.email, '777777');
    expect(await verify(customer.email, '777777', token)).toBe('verified');
    const id = await hold('17:00', { session: s });
    const confirm = (over: Partial<Parameters<typeof confirmHold>[1]> = {}) =>
      confirmHold(db.app, {
        organizationId: org,
        bookingId: id,
        sessionHash: s,
        customer,
        verification: { kind: 'otp-token', tokenHash: sha256(token) },
        marketingConsent: true,
        now: new Date(NOW + 3 * MIN),
        maxFutureBookings: 3,
        ...over,
      });
    const reason = (p: Promise<unknown>) =>
      p.then(
        () => 'ok',
        (e: unknown) => (e instanceof BookingRejected ? e.reason : 'errore'),
      );

    // email diversa da quella verificata
    expect(await reason(confirm({ customer: { ...customer, email: 'altra@example.com' } }))).toBe(
      'contact-not-verified',
    );
    // la conferma fallisce per un altro motivo → il token NON si consuma
    expect(await reason(confirm({ sessionHash: session('intruso') }))).toBe('hold-not-owned');
    expect(await reason(confirm({ maxFutureBookings: 0 }))).toBe('too-many-future-bookings');
    expect(await reason(confirm())).toBe('ok');
    const c = await db.admin.query<{ marketing_consent_at: Date | null; email_verified_at: Date | null }>(
      'SELECT marketing_consent_at, email_verified_at FROM customers WHERE email = $1',
      [customer.email],
    );
    expect(c.rows[0]?.marketing_consent_at).not.toBeNull();
    expect(c.rows[0]?.email_verified_at).not.toBeNull();

    // stesso token su un altro hold: già consumato
    const other = await hold('18:00', { session: s });
    expect(
      await reason(
        confirmHold(db.app, {
          organizationId: org,
          bookingId: other,
          sessionHash: s,
          customer,
          verification: { kind: 'otp-token', tokenHash: sha256(token) },
          now: new Date(NOW + 4 * MIN),
          maxFutureBookings: 3,
        }),
      ),
    ).toBe('contact-not-verified');
  });
});
