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
