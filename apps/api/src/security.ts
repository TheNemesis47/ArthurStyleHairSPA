import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { sha256 } from '@arthur/db';

// ───────────────────────────── Verifica umana (Cloudflare Turnstile) ─────────────────────────────

/** Porta: in produzione Turnstile, nei test un finto. Deve fallire CHIUSA (errore di rete → false). */
export interface HumanVerifier {
  verify(token: string | undefined, ip: string): Promise<boolean>;
}

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SiteverifyResponse = z.object({
  success: z.boolean(),
  hostname: z.string().optional(),
});

/**
 * Validazione lato server del token Turnstile (developers.cloudflare.com/turnstile/get-started/server-side-validation):
 * POST JSON { secret, response, remoteip }; token max 2048 caratteri, valido 300 s, monouso.
 * `hostnames`: se indicati, il token deve venire da uno di questi siti (un token di un altro sito non vale).
 */
export function turnstileVerifier(
  secret: string,
  opts: { hostnames?: readonly string[]; timeoutMs?: number; fetchFn?: typeof fetch } = {},
): HumanVerifier {
  const doFetch = opts.fetchFn ?? fetch;
  return {
    async verify(token, ip) {
      if (token === undefined || token === '' || token.length > 2048) return false;
      try {
        const res = await doFetch(SITEVERIFY_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ secret, response: token, remoteip: ip }),
          signal: AbortSignal.timeout(opts.timeoutMs ?? 5000),
        });
        if (!res.ok) return false;
        const body = SiteverifyResponse.safeParse(await res.json());
        if (!body.success || !body.data.success) return false;
        const hostnames = opts.hostnames ?? [];
        return hostnames.length === 0 || hostnames.includes(body.data.hostname ?? '');
      } catch {
        return false;
      }
    },
  };
}

// ───────────────────────────── Segreti e token ─────────────────────────────

export const hmac = (secret: string, data: string): Buffer =>
  createHmac('sha256', secret).update(data).digest();

/** Token opaco a 256 bit (link di gestione, token di verifica, sessione hold). */
export const randomToken = (): string => randomBytes(32).toString('base64url');

/** OTP a 6 cifre con generatore crittografico (randomInt è uniforme, niente bias del modulo). */
export const sixDigitCode = (): string => String(randomInt(0, 1_000_000)).padStart(6, '0');

export const safeEqual = (a: Buffer, b: Buffer): boolean => a.length === b.length && timingSafeEqual(a, b);

// ───────────────────────────── Sessione dell'hold (cookie __Host-hold) ─────────────────────────────

export const HOLD_COOKIE = '__Host-hold';
const SESSION_MAX_AGE_SEC = 24 * 3600;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

/**
 * Hash della sessione dal cookie firmato, o null. Il database vede solo lo SHA-256 dell'identificativo:
 * chi legge il DB non può impersonare una sessione.
 */
export function readHoldSession(request: FastifyRequest): Buffer | null {
  const raw = request.cookies[HOLD_COOKIE];
  if (raw === undefined) return null;
  const unsigned = request.unsignCookie(raw);
  if (!unsigned.valid || !TOKEN_RE.test(unsigned.value)) return null;
  return sha256(unsigned.value);
}

/** Come readHoldSession, ma se manca crea la sessione e imposta il cookie (HttpOnly, Secure, SameSite=Lax). */
export function ensureHoldSession(request: FastifyRequest, reply: FastifyReply): Buffer {
  const existing = readHoldSession(request);
  if (existing !== null) return existing;
  const id = randomToken();
  reply.setCookie(HOLD_COOKIE, id, {
    signed: true,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SEC,
  });
  return sha256(id);
}
