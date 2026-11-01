import type { AllocationKind, PoolRequirement, ServiceDef } from './types.ts';

/** Un tratto del template, con offset in minuti rispetto all'inizio dell'occupazione. */
export interface Segment {
  readonly offsetStartMin: number;
  readonly offsetEndMin: number;
  readonly staffBusy: boolean;
  readonly requirements: readonly PoolRequirement[];
  readonly kind: AllocationKind;
  readonly serviceIndex: number;
}

export interface Template {
  readonly segments: readonly Segment[];
  readonly totalMin: number;
  /** Inizio e fine "visti dal cliente" (esclusi i buffer). */
  readonly customerStartMin: number;
  readonly customerEndMin: number;
}

/** Durata di una fase per un operatore più lento o più veloce, arrotondata a 5 minuti (min 5). */
export function scaledDuration(durationMin: number, factorPct: number): number {
  if (factorPct === 100) return durationMin;
  return Math.max(5, Math.round((durationMin * factorPct) / 100 / 5) * 5);
}

/**
 * Concatena i servizi nell'ordine dato: buffer prima → fasi → buffer dopo, servizio per servizio.
 * I buffer occupano l'operatore (preparazione, riordino) ma non le postazioni.
 */
export function buildTemplate(services: readonly ServiceDef[], factorsPct: readonly number[] = []): Template {
  if (services.length === 0) throw new RangeError('Serve almeno un servizio');
  const segments: Segment[] = [];
  let t = 0;
  let customerStart = -1;
  let customerEnd = 0;
  services.forEach((svc, serviceIndex) => {
    if (svc.steps.length === 0) throw new RangeError(`Il servizio ${svc.id} non ha fasi`);
    if (svc.bufferBeforeMin > 0) {
      segments.push({
        offsetStartMin: t,
        offsetEndMin: t + svc.bufferBeforeMin,
        staffBusy: true,
        requirements: [],
        kind: 'buffer',
        serviceIndex,
      });
      t += svc.bufferBeforeMin;
    }
    const factor = factorsPct[serviceIndex] ?? 100;
    for (const step of svc.steps) {
      if (step.durationMin <= 0) throw new RangeError(`Durata non valida nel servizio ${svc.id}`);
      const d = scaledDuration(step.durationMin, factor);
      segments.push({
        offsetStartMin: t,
        offsetEndMin: t + d,
        staffBusy: step.staffBusy,
        requirements: step.requirements,
        kind: step.staffBusy ? 'service' : 'processing',
        serviceIndex,
      });
      if (customerStart < 0) customerStart = t;
      t += d;
      customerEnd = t;
    }
    if (svc.bufferAfterMin > 0) {
      segments.push({
        offsetStartMin: t,
        offsetEndMin: t + svc.bufferAfterMin,
        staffBusy: true,
        requirements: [],
        kind: 'buffer',
        serviceIndex,
      });
      t += svc.bufferAfterMin;
    }
  });
  return { segments, totalMin: t, customerStartMin: customerStart, customerEndMin: customerEnd };
}
