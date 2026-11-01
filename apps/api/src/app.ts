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
import { installErrorHandlers, sendProblem } from './problems.ts';
import { healthRoutes } from './routes/health.ts';
import { publicRoutes } from './routes/public.ts';

/**
 * Policy di autorizzazione dichiarata su OGNI rotta (AGENTS regola 3): una rotta senza policy blocca l'avvio.
 * - public: anonima (con rate limit);
 * - internal: healthcheck, non esposti da Caddy.
 * Cliente, staff e owner arrivano con Better Auth (F1.5).
 */
export type AuthPolicy = 'public' | 'internal';

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
  /** Limiti per IP al minuto (sovrascrivibili nei test). */
  readonly rateLimits?: { readonly global: number; readonly availability: number };
}

export const DEFAULT_RATE_LIMITS = { global: 300, availability: 60 } as const;

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
  await app.register(cors, { origin: [...(deps.corsOrigins ?? [])], methods: ['GET'] });

  const limits = deps.rateLimits ?? DEFAULT_RATE_LIMITS;
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
  return app;
}
