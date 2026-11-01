import type { FastifyPluginCallback } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type pg from 'pg';
import { Health, Problem } from '@arthur/contracts';

/** Healthcheck per Docker/Caddy: non esposti all'esterno (docs/07 §3). `ready` verifica il database. */
export const healthRoutes: FastifyPluginCallback<{ pool: pg.Pool }> = (fastify, { pool }, done) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const hide = { hide: true } as const;

  app.get(
    '/health/live',
    { config: { auth: 'internal', rateLimit: false }, schema: { ...hide, response: { 200: Health } } },
    () => ({ status: 'ok' as const }),
  );

  app.get(
    '/health/ready',
    {
      config: { auth: 'internal', rateLimit: false },
      schema: { ...hide, response: { 200: Health, 503: Problem } },
    },
    async (request, reply) => {
      try {
        await pool.query('SELECT 1');
        return { status: 'ok' as const };
      } catch (err) {
        request.log.warn({ err: { message: (err as Error).message } }, 'database non raggiungibile');
        return reply.code(503).type('application/problem+json; charset=utf-8').send({
          type: 'about:blank',
          title: 'Database non raggiungibile',
          status: 503,
        });
      }
    },
  );
  done();
};
