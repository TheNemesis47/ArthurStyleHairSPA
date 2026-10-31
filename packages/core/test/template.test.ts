import { describe, expect, it } from 'vitest';
import { buildTemplate, scaledDuration } from '../src/booking/template.js';
import type { ServiceDef } from '../src/booking/types.js';

const svc = (over: Partial<ServiceDef> = {}): ServiceDef => ({
  id: 's',
  bufferBeforeMin: 0,
  bufferAfterMin: 0,
  steps: [{ durationMin: 30, staffBusy: true, requirements: [] }],
  ...over,
});

describe('buildTemplate', () => {
  it("buffer prima e dopo: occupano l'operatore ma non contano nella durata per il cliente", () => {
    const t = buildTemplate([svc({ bufferBeforeMin: 5, bufferAfterMin: 10 })]);
    expect(t.totalMin).toBe(45);
    expect(t.customerStartMin).toBe(5);
    expect(t.customerEndMin).toBe(35);
    expect(t.segments.map((s) => s.kind)).toEqual(['buffer', 'service', 'buffer']);
    expect(t.segments.every((s) => s.staffBusy)).toBe(true);
  });

  it('il tempo di posa diventa un segmento "processing" con l\'operatore libero', () => {
    const t = buildTemplate([
      svc({
        steps: [
          { durationMin: 20, staffBusy: true, requirements: [] },
          { durationMin: 30, staffBusy: false, requirements: [] },
        ],
      }),
    ]);
    expect(t.segments[1]).toMatchObject({
      kind: 'processing',
      staffBusy: false,
      offsetStartMin: 20,
      offsetEndMin: 50,
    });
  });

  it('applica il fattore di durata per servizio, arrotondato a 5 minuti', () => {
    expect(
      buildTemplate([svc(), svc({ id: 't' })], [120, 50]).segments.map(
        (s) => s.offsetEndMin - s.offsetStartMin,
      ),
    ).toEqual([35, 15]);
    expect(scaledDuration(25, 100)).toBe(25);
    expect(scaledDuration(25, 120)).toBe(30);
    expect(scaledDuration(5, 50)).toBe(5); // mai sotto i 5 minuti
  });

  it('rifiuta liste vuote, servizi senza fasi e durate non positive', () => {
    expect(() => buildTemplate([])).toThrow(RangeError);
    expect(() => buildTemplate([svc({ steps: [] })])).toThrow(RangeError);
    expect(() =>
      buildTemplate([svc({ steps: [{ durationMin: 0, staffBusy: true, requirements: [] }] })]),
    ).toThrow(RangeError);
  });
});
