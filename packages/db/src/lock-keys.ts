import { localDateOf } from '@arthur/core';

interface HasResourceAndInterval {
  readonly resourceId: string;
  readonly interval: { readonly start: number; readonly end: number };
}

/**
 * Chiavi dei lock advisory per una scrittura sulle prenotazioni: una per (risorsa, giorno locale), ORDINATE.
 * Acquisirle in ordine crescente evita i deadlock tra transazioni che toccano insiemi di risorse diversi
 * (verificato: docs/research/2026-10-31-verifica-esclusione-postgres.md). Il vincolo EXCLUDE resta la garanzia.
 */
export function advisoryLockKeys(assignments: readonly HasResourceAndInterval[], timezone: string): string[] {
  const keys = new Set<string>();
  for (const a of assignments) {
    keys.add(`${a.resourceId}:${localDateOf(a.interval.start, timezone)}`);
    keys.add(`${a.resourceId}:${localDateOf(a.interval.end - 1, timezone)}`);
  }
  return [...keys].sort();
}
