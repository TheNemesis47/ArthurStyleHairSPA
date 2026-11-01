import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { computeAvailability } from '../src/booking/availability.ts';
import { IntervalSet } from '../src/booking/interval-set.ts';
import type { ExistingAllocation, ServiceDef } from '../src/booking/types.ts';
import { ALL_STAFF2, ARTURO, POOLS, at, input, localHM } from './fixtures-ext.ts';

const MIN = 60_000;
const DAY_START = at('2026-11-03T08:00');
const RESOURCES = ['arturo', 'staff2', 'p1', 'p2', 'p3', 'l1'] as const;

const arbAllocation: fc.Arbitrary<ExistingAllocation> = fc
  .record({
    r: fc.constantFrom(...RESOURCES),
    startSlot: fc.integer({ min: 0, max: 144 }),
    len: fc.integer({ min: 1, max: 24 }),
  })
  .map(({ r, startSlot, len }) => ({
    resourceId: r,
    interval: { start: DAY_START + startSlot * 5 * MIN, end: DAY_START + (startSlot + len) * 5 * MIN },
  }));

const arbService: fc.Arbitrary<ServiceDef> = fc
  .record({
    before: fc.constantFrom(0, 5),
    after: fc.constantFrom(0, 5, 10),
    steps: fc.array(
      fc.record({
        durationMin: fc.integer({ min: 1, max: 12 }).map((x) => x * 5),
        staffBusy: fc.boolean(),
        pool: fc.constantFrom('P', 'L', null),
      }),
      { minLength: 1, maxLength: 4 },
    ),
  })
  .map(({ before, after, steps }) => ({
    id: 'mezzora', // gli operatori di test sono abilitati a questo id
    bufferBeforeMin: before,
    bufferAfterMin: after,
    steps: steps.map((s) => ({
      durationMin: s.durationMin,
      staffBusy: s.staffBusy,
      requirements: s.pool === null ? [] : [{ poolId: s.pool, quantity: 1 }],
    })),
  }));

const scenario = fc.record({ service: arbService, allocations: fc.array(arbAllocation, { maxLength: 25 }) });
const run = (service: ServiceDef, allocations: ExistingAllocation[]) =>
  computeAvailability(input({ services: [service], staff: [ARTURO, ALL_STAFF2], pools: POOLS, allocations }));

describe('computeAvailability — proprietà', () => {
  it("P1: nessuna assegnazione si sovrappone a un'allocazione esistente sulla stessa risorsa", () => {
    fc.assert(
      fc.property(scenario, ({ service, allocations }) => {
        const busy = new Map<string, IntervalSet>();
        for (const r of RESOURCES)
          busy.set(r, IntervalSet.of(allocations.filter((a) => a.resourceId === r).map((a) => a.interval)));
        for (const slot of run(service, allocations))
          for (const a of slot.assignments) expect(busy.get(a.resourceId)!.overlaps(a.interval)).toBe(false);
      }),
      { numRuns: 300 },
    );
  });

  it('P2: le assegnazioni di uno stesso slot non si sovrappongono tra loro sulla stessa risorsa', () => {
    fc.assert(
      fc.property(scenario, ({ service, allocations }) => {
        for (const slot of run(service, allocations)) {
          const byRes = new Map<string, { start: number; end: number }[]>();
          for (const a of slot.assignments)
            byRes.set(a.resourceId, [...(byRes.get(a.resourceId) ?? []), a.interval]);
          for (const list of byRes.values()) {
            const total = list.reduce((s, i) => s + i.end - i.start, 0);
            const merged = IntervalSet.of(list)
              .toArray()
              .reduce((s, i) => s + i.end - i.start, 0);
            expect(merged).toBe(total); // nessuna sovrapposizione interna
          }
        }
      }),
      { numRuns: 300 },
    );
  });

  it("P3: ogni slot è dentro l'orario del salone, sulla griglia, e l'operatore è assegnato a ogni tratto in cui lavora", () => {
    fc.assert(
      fc.property(scenario, ({ service, allocations }) => {
        const open = IntervalSet.of([{ start: at('2026-11-03T09:00'), end: at('2026-11-03T19:00') }]);
        for (const slot of run(service, allocations)) {
          expect(open.contains({ start: slot.start, end: slot.end })).toBe(true);
          expect(Number(localHM(slot.start).slice(3)) % 15).toBe(0);
          const staffMinutes =
            slot.assignments
              .filter((a) => a.resourceId === slot.staffId)
              .reduce((s, a) => s + a.interval.end - a.interval.start, 0) / MIN;
          const expected =
            service.bufferBeforeMin +
            service.bufferAfterMin +
            service.steps.filter((s) => s.staffBusy).reduce((s, x) => s + x.durationMin, 0);
          expect(staffMinutes).toBe(expected);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("P4 (monotonia): aggiungere un'allocazione non può far comparire nuovi orari", () => {
    fc.assert(
      fc.property(scenario, arbAllocation, ({ service, allocations }, extra) => {
        const before = new Set(run(service, allocations).map((s) => s.start));
        for (const s of run(service, [...allocations, extra])) expect(before.has(s.start)).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  it('P5 (oracolo): prenotare davvero uno slot restituito non crea conflitti, e lo slot sparisce', () => {
    fc.assert(
      fc.property(scenario, fc.nat(), ({ service, allocations }, pick) => {
        const slots = run(service, allocations);
        fc.pre(slots.length > 0);
        const chosen = slots[pick % slots.length]!;
        const after = [
          ...allocations,
          ...chosen.assignments.map((a) => ({ resourceId: a.resourceId, interval: a.interval })),
        ];
        // la nuova agenda resta senza sovrapposizioni per risorsa
        for (const r of RESOURCES) {
          const list = after.filter((a) => a.resourceId === r).map((a) => a.interval);
          const original = allocations.filter((a) => a.resourceId === r).map((a) => a.interval);
          const added = list.slice(original.length);
          for (const i of added) expect(IntervalSet.of(original).overlaps(i)).toBe(false);
        }
        // lo stesso orario non è più proponibile con le stesse risorse: se ricompare, deve usare risorse diverse
        const again = run(service, after).find((s) => s.start === chosen.start);
        if (again !== undefined) {
          const used = new Set(chosen.assignments.map((a) => `${a.resourceId}@${String(a.interval.start)}`));
          expect(again.assignments.some((a) => used.has(`${a.resourceId}@${String(a.interval.start)}`))).toBe(
            false,
          );
        }
      }),
      { numRuns: 300 },
    );
  });
});
