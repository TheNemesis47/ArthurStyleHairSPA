import type { FastifyInstance } from 'fastify';
import { fixedClock } from '@arthur/core';
import { findOrganizationId, readMockSeed, seed } from '@arthur/db';
import { createTestDb, type TestDb } from '@arthur/db/testing';
import { buildApp, type AppDeps } from '../src/app.ts';
import type { MailMessage } from '../src/mail.ts';

export const DOC = new URL('../../../docs/21-dati-mock.md', import.meta.url).pathname;
export const ORIGIN = 'https://api.test.invalid';
export const SITE = 'https://www.test.invalid';
export const PROBLEM = 'application/problem+json; charset=utf-8';
/** Token Turnstile che il finto verificatore accetta (tutti gli altri falliscono). */
export const HUMAN = 'token-umano';

export interface Harness {
  readonly db: TestDb;
  readonly organizationId: string;
  readonly mails: MailMessage[];
  build(overrides?: Partial<AppDeps>): Promise<FastifyInstance>;
}

/** DB usa e getta con il seed di docs/21 e un'API che usa il ruolo app_api (RLS), come in produzione. */
export async function createHarness(now: number): Promise<Harness> {
  const db = await createTestDb();
  await seed(db.admin, readMockSeed(DOC));
  const organizationId = await findOrganizationId(db.app, 'arthur-style');
  if (organizationId === undefined) throw new Error('seed mancante');
  const mails: MailMessage[] = [];
  return {
    db,
    organizationId,
    mails,
    build: (overrides = {}) =>
      buildApp({
        pool: db.app,
        organizationId,
        clock: fixedClock(now),
        publicOrigin: ORIGIN,
        corsOrigins: [SITE],
        secrets: { holdCookie: 'c'.repeat(40), otp: 'o'.repeat(40) },
        human: { verify: (token) => Promise.resolve(token === HUMAN) },
        mailer: {
          send: (m) => {
            mails.push(m);
            return Promise.resolve();
          },
        },
        ...overrides,
      }),
  };
}

/** Prenotazione completa via HTTP (hold → OTP → verifica → conferma), come dal sito. */
export async function bookViaApi(
  app: FastifyInstance,
  mails: readonly MailMessage[],
  start: string,
  email: string,
  services: readonly string[] = ['taglio-piega'],
): Promise<{ id: string; manageToken: string }> {
  const { randomUUID } = await import('node:crypto');
  const { HOLD_COOKIE } = await import('../src/security.ts');
  const hold = await app.inject({
    method: 'POST',
    url: '/v1/booking-holds',
    headers: { 'idempotency-key': randomUUID(), 'cf-turnstile-response': HUMAN },
    payload: { location: 'firenze', services, start },
  });
  if (hold.statusCode !== 201) throw new Error(`hold ${String(hold.statusCode)}: ${hold.body}`);
  const cookie = hold.cookies.find((c) => c.name === HOLD_COOKIE)?.value ?? '';
  await app.inject({
    method: 'POST',
    url: '/v1/otp',
    headers: { 'cf-turnstile-response': HUMAN },
    payload: { email, locale: 'it' },
  });
  const code = /\b(\d{6})\b/.exec(mails.filter((m) => m.to === email).at(-1)?.text ?? '')?.[1] ?? '';
  const verified = await app.inject({ method: 'POST', url: '/v1/otp/verify', payload: { email, code } });
  const confirm = await app.inject({
    method: 'POST',
    url: `/v1/booking-holds/${hold.json<{ id: string }>().id}/confirm`,
    cookies: { [HOLD_COOKIE]: cookie },
    payload: {
      verificationToken: verified.json<{ verificationToken: string }>().verificationToken,
      customer: { firstName: 'Test', lastName: 'Cliente', email, locale: 'it' },
      acceptPrivacy: true,
    },
  });
  if (confirm.statusCode !== 201) throw new Error(`conferma ${String(confirm.statusCode)}: ${confirm.body}`);
  const out = confirm.json<{ booking: { id: string }; manageToken: string }>();
  return { id: out.booking.id, manageToken: out.manageToken };
}
