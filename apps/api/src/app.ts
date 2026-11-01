import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type pg from 'pg';
import type { Clock } from '@arthur/core';
import type { Mailer } from './mail.ts';
import { installErrorHandlers, sendProblem } from './problems.ts';
import { bookingRoutes, DEFAULT_BOOKING_LIMITS, type BookingLimits } from './routes/booking.ts';
import { healthRoutes } from './routes/health.ts';
import { publicRoutes } from './routes/public.ts';
import type { HumanVerifier } from './security.ts';

/**
 * Policy di autorizzazione dichiarata su OGNI rotta (AGENTS regola 3): una rotta senza policy blocca l'avvio.
 * - public: anonima (con rate limit);
 * - hold-session: l'oggetto appartiene alla sessione del cookie __Host-hold (controllo nel DB, per oggetto);
 * - internal: healthcheck, non esposti da Caddy.
 * Cliente, staff e owner arrivano con Better Auth (F1.5).
 */
export type AuthPolicy = 'public' | 'hold-session' | 'internal';

declare module 'fastify' {
  interface FastifyContextConfig {
    auth?: AuthPolicy;
  }
}

export interface AppDeps {
  readonly pool: pg.Pool;
  readonly organizationId: string;
  readonly clock: Clock;
  readonly publicOrigin: string;
  readonly corsOrigins?: readonly string[];
  readonly trustProxy?: string | boolean;
  readonly logLevel?: string;
  /** Firma del cookie __Host-hold e chiave HMAC degli OTP (config.ts: ≥ 32 caratteri, diverse). */
  readonly secrets: { readonly holdCookie: string; readonly otp: string };
  readonly human: HumanVerifier;
  readonly mailer: Mailer;
  /** Limiti per IP (sovrascrivibili nei test). */
  readonly rateLimits?: Partial<RateLimits>;
}

export interface RateLimits extends BookingLimits {
  /** Richieste al minuto, globali e per la disponibilità. */
  readonly global: number;
  readonly availability: number;
}

export const DEFAULT_RATE_LIMITS: RateLimits = { global: 300, availability: 60, ...DEFAULT_BOOKING_LIMITS };

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    trustProxy: deps.trustProxy ?? false,
    bodyLimit: 64 * 1024,
    logger:
      deps.logLevel === undefined || deps.logLevel === 'silent'
        ? false
        : {
            level: deps.logLevel,
            // niente cookie, token o header di autorizzazione nei log (AGENTS regola 5)
            redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
          },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.addHook('onRoute', (route) => {
    // Unica eccezione: la rotta di preflight aggiunta da @fastify/cors (risponde solo con gli header CORS).
    const corsPreflight = route.method === 'OPTIONS' && route.url === '*';
    if (route.config?.auth === undefined && !corsPreflight)
      throw new Error(`Rotta senza policy di autorizzazione: ${String(route.method)} ${route.url}`);
  });

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Arthur Style API',
        version: '1.0.0',
        description:
          'API REST /v1 (docs/07). Errori RFC 9457, date ISO 8601 con offset, denaro in centesimi.',
      },
      servers: [{ url: deps.publicOrigin }],
    },
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject,
  });

  await app.register(helmet, {
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'same-site' },
  });
  const corsOrigins = [...(deps.corsOrigins ?? [])];
  await app.register(cors, {
    origin: corsOrigins,
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true, // il cookie __Host-hold viaggia con fetch(..., { credentials: 'include' })
    allowedHeaders: ['content-type', 'idempotency-key', 'cf-turnstile-response'],
    maxAge: 600,
  });
  // Difesa CSRF in profondità: una scrittura che arriva da un browser deve venire da un'origine ammessa.
  // (Le app native non mandano Origin; SameSite=Lax copre già i siti terzi.)
  app.addHook('onRequest', (request, reply, next) => {
    const requestOrigin = request.headers.origin;
    if (
      UNSAFE_METHODS.has(request.method) &&
      requestOrigin !== undefined &&
      !corsOrigins.includes(requestOrigin)
    ) {
      void sendProblem(reply, deps.publicOrigin, 'forbidden-origin');
      return;
    }
    next();
  });
  await app.register(cookie, { secret: deps.secrets.holdCookie, algorithm: 'sha256' });

  const limits: RateLimits = { ...DEFAULT_RATE_LIMITS, ...deps.rateLimits };
  await app.register(rateLimit, {
    global: true,
    max: limits.global,
    timeWindow: '1 minute',
    enableDraftSpec: true,
  });

  installErrorHandlers(app, deps.publicOrigin);
  app.setNotFoundHandler(
    { preHandler: app.rateLimit({ max: 60, timeWindow: '1 minute' }) }, // niente scansione degli URL a raffica
    (_request, reply) => sendProblem(reply, deps.publicOrigin, 'not-found'),
  );

  await app.register(healthRoutes, { pool: deps.pool });
  await app.register(publicRoutes, {
    prefix: '/v1',
    pool: deps.pool,
    organizationId: deps.organizationId,
    clock: deps.clock,
    publicOrigin: deps.publicOrigin,
    availabilityLimit: limits.availability,
  });
  await app.register(bookingRoutes, {
    prefix: '/v1',
    pool: deps.pool,
    organizationId: deps.organizationId,
    clock: deps.clock,
    publicOrigin: deps.publicOrigin,
    human: deps.human,
    mailer: deps.mailer,
    otpSecret: deps.secrets.otp,
    limits,
  });
  return app;
}
