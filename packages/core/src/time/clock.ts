import type { EpochMs } from '../booking/types.ts';

/** Porta del tempo: il dominio non legge mai l'orologio di sistema (AGENTS regola 7). */
export interface Clock {
  now(): EpochMs;
}

/** Orologio fermo, per test e ricalcoli deterministici. */
export function fixedClock(at: EpochMs): Clock {
  return { now: () => at };
}
