import { describe, expect, it } from 'vitest';
import { computeAvailability } from '../src/booking/availability.ts';
import type { ServiceDef } from '../src/booking/types.ts';
import {
  ALL_STAFF2,
  ARTURO,
  COLORE,
  MEZZORA,
  ORA,
  PIEGA,
  QUARTO,
  TAGLIO,
  alloc,
  at,
  input,
  localHM,
  staff,
  week,
} from './fixtures-ext.ts';

const starts = (slots: ReturnType<typeof computeAvailability>) => slots.map((s) => localHM(s.start));

describe('computeAvailability — giornata base', () => {
  it("taglio 25': dalle 09:00 alle 18:30 ogni 15' (39 slot), fine entro la chiusura", () => {
    const slots = computeAvailability(input());
    expect(slots).toHaveLength(39);
    expect(localHM(slots[0]!.start)).toBe('09:00');
    expect(localHM(slots.at(-1)!.start)).toBe('18:30');
    expect(localHM(slots.at(-1)!.end)).toBe('18:55');
  });

  it('assegna operatore e una poltrona del pool', () => {
    const [first] = computeAvailability(input());
    expect(first!.staffId).toBe('arturo');
    expect(first!.assignments.map((a) => a.resourceId).sort()).toEqual(['arturo', 'p1']);
  });

  it('giorni di chiusura (domenica, lunedì): nessuno slot', () => {
    expect(computeAvailability(input({ from: '2026-11-08', to: '2026-11-09' }))).toEqual([]);
  });
});

describe('computeAvailability — casi limite (docs/06 §7)', () => {
  it('E2: appuntamenti adiacenti ammessi, sovrapposti no', () => {
    const s = starts(
      computeAvailability(input({ allocations: [alloc('arturo', '2026-11-03T10:00', '2026-11-03T10:30')] })),
    );
    expect(s).toContain('09:30'); // 09:30–09:55
    expect(s).not.toContain('09:45'); // 09:45–10:10 si sovrappone
    expect(s).not.toContain('10:15');
    expect(s).toContain('10:30'); // inizia esattamente quando finisce l'altro
  });

  it("tempo di posa: durante la posa di un colore Arturo può fare un taglio su un'altra poltrona", () => {
    // colore alle 10:00: Arturo 10:00–10:25, posa 10:25–11:00 (Arturo libero, p1 occupata), lavaggio 11:00–11:10, piega 11:10–11:45, riordino 11:45–11:50
    const allocations = [
      alloc('arturo', '2026-11-03T10:00', '2026-11-03T10:25'),
      alloc('p1', '2026-11-03T10:00', '2026-11-03T11:00'),
      alloc('arturo', '2026-11-03T11:00', '2026-11-03T11:10'),
      alloc('l1', '2026-11-03T11:00', '2026-11-03T11:10'),
      alloc('arturo', '2026-11-03T11:10', '2026-11-03T11:50'),
      alloc('p1', '2026-11-03T11:10', '2026-11-03T11:45'),
    ];
    const slots = computeAvailability(input({ allocations }));
    const s1030 = slots.find((s) => localHM(s.start) === '10:30');
    expect(s1030).toBeDefined();
    expect(s1030!.assignments.map((a) => a.resourceId).sort()).toEqual(['arturo', 'p2']); // non p1, occupata dalla posa
    expect(starts(slots)).not.toContain('10:45'); // finirebbe 11:10, quando Arturo lava
  });

  it('collo di bottiglia: un solo lavatesta blocca la piega anche con un secondo operatore libero', () => {
    const slots = computeAvailability(
      input({
        services: [PIEGA],
        staff: [ARTURO, ALL_STAFF2],
        allocations: [
          alloc('arturo', '2026-11-03T11:00', '2026-11-03T11:10'),
          alloc('l1', '2026-11-03T11:00', '2026-11-03T11:10'),
        ],
      }),
    );
    expect(starts(slots)).not.toContain('11:00');
    expect(starts(slots)).toContain('11:15');
  });

  it("colore con buffer: durata cliente 1 h 45', occupazione 1 h 50', ultimo inizio 17:00", () => {
    const slots = computeAvailability(input({ services: [COLORE] }));
    const first = slots[0]!;
    expect((first.customerEnd - first.customerStart) / 60_000).toBe(105);
    expect((first.end - first.start) / 60_000).toBe(110);
    expect(localHM(slots.at(-1)!.start)).toBe('17:00');
    // la posa non occupa l'operatore ma occupa la poltrona
    expect(first.assignments.filter((a) => a.kind === 'processing').map((a) => a.resourceId)).toEqual(['p1']);
    // la stessa poltrona per applicazione, posa e piega
    expect(
      new Set(first.assignments.filter((a) => a.resourceId.startsWith('p')).map((a) => a.resourceId)),
    ).toEqual(new Set(['p1']));
  });

  it('più servizi in sequenza: colore + taglio = 105 + 5 (riordino) + 25 minuti', () => {
    const [first] = computeAvailability(input({ services: [COLORE, TAGLIO] }));
    expect((first!.customerEnd - first!.customerStart) / 60_000).toBe(135);
  });

  it("E4: un servizio da 60' non inizia dopo le 18:00", () => {
    expect(localHM(computeAvailability(input({ services: [ORA] })).at(-1)!.start)).toBe('18:00');
  });

  it('ultimo orario di inizio della sede (last_start)', () => {
    const hours = week([2], '09:00', '19:00', { lastStart: '18:30' });
    const slots = computeAvailability(
      input({ services: [QUARTO], locationHours: hours, staff: [staff('arturo', 0, hours)] }),
    );
    expect(localHM(slots.at(-1)!.start)).toBe('18:30');
  });

  it("E5: la pausa pranzo dell'operatore può cadere solo dentro un tempo di posa", () => {
    const posaLunga: ServiceDef = {
      id: 'posa-lunga',
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
      steps: [
        { durationMin: 15, staffBusy: true, requirements: [] },
        { durationMin: 60, staffBusy: false, requirements: [] },
        { durationMin: 15, staffBusy: true, requirements: [] },
      ],
    };
    const lunch = [...week([2], '09:00', '13:00'), ...week([2], '14:00', '19:00')];
    const s = starts(
      computeAvailability(input({ services: [posaLunga], staff: [staff('arturo', 0, lunch)] })),
    );
    expect(s).toContain('12:45'); // applica 12:45–13:00, posa 13:00–14:00 (pranzo), finisce 14:00–14:15
    expect(s).not.toContain('12:30'); // finirebbe 13:45–14:00, in pausa
    expect(s).not.toContain('13:00');
  });

  it('preavviso minimo: alle 10:02 con 3 h di preavviso il primo slot è 13:15', () => {
    const slots = computeAvailability(
      input({
        now: at('2026-11-03T10:02'),
        policy: { slotGranularityMin: 15, minNoticeMin: 180, maxAdvanceDays: 35 },
      }),
    );
    expect(localHM(slots[0]!.start)).toBe('13:15');
  });

  it('orizzonte massimo: con 1 giorno si prenota solo fino a domani', () => {
    const slots = computeAvailability(
      input({ to: '2026-11-05', policy: { slotGranularityMin: 15, minNoticeMin: 0, maxAdvanceDays: 1 } }),
    );
    expect(new Set(slots.map((s) => new Date(s.start).toISOString().slice(0, 10)))).toEqual(
      new Set(['2026-11-03']),
    );
  });

  it('E14: niente appuntamenti a cavallo della mezzanotte (apertura straordinaria serale)', () => {
    const exceptions = [
      {
        resourceId: null,
        kind: 'extra_open' as const,
        interval: { start: at('2026-11-03T19:00'), end: at('2026-11-04T01:00') },
      },
    ];
    const s = starts(computeAvailability(input({ services: [ORA], exceptions })));
    expect(s).toContain('23:00');
    expect(s).not.toContain('23:15');
  });

  it('chiusura del salone e permesso di un operatore', () => {
    const closed = [
      {
        resourceId: null,
        kind: 'closed' as const,
        interval: { start: at('2026-11-03T00:00'), end: at('2026-11-04T00:00') },
      },
    ];
    expect(computeAvailability(input({ exceptions: closed }))).toEqual([]);
    const timeOff = [
      {
        resourceId: 'arturo',
        kind: 'time_off' as const,
        interval: { start: at('2026-11-03T09:00'), end: at('2026-11-03T19:00') },
      },
    ];
    const slots = computeAvailability(input({ staff: [ARTURO, ALL_STAFF2], exceptions: timeOff }));
    expect(new Set(slots.map((s) => s.staffId))).toEqual(new Set(['staff2']));
  });

  it('una risorsa del pool fuori servizio non viene assegnata', () => {
    const exceptions = [
      {
        resourceId: 'l1',
        kind: 'closed' as const,
        interval: { start: at('2026-11-03T09:00'), end: at('2026-11-03T19:00') },
      },
    ];
    expect(computeAvailability(input({ services: [PIEGA], exceptions }))).toEqual([]);
  });
});

describe("computeAvailability — assegnazione dell'operatore (Q21)", () => {
  it('bilancia il carico: con Arturo pieno al mattino, il pomeriggio va al collega', () => {
    const slots = computeAvailability(
      input({
        staff: [ARTURO, ALL_STAFF2],
        allocations: [alloc('arturo', '2026-11-03T09:00', '2026-11-03T12:00')],
      }),
    );
    expect(slots.find((s) => localHM(s.start) === '14:00')!.staffId).toBe('staff2');
  });

  it('un solo slot per orario anche con più operatori liberi', () => {
    const slots = computeAvailability(input({ staff: [ARTURO, ALL_STAFF2] }));
    expect(new Set(slots.map((s) => s.start)).size).toBe(slots.length);
  });

  it('considera solo gli operatori abilitati a tutti i servizi', () => {
    const soloTaglio = staff('staff3', 1, undefined, {}, ['taglio']);
    const slots = computeAvailability(input({ services: [COLORE], staff: [soloTaglio] }));
    expect(slots).toEqual([]);
  });

  it("preferenza esplicita (solo pannello): restituisce solo quell'operatore", () => {
    const slots = computeAvailability(
      input({ staff: [ARTURO, ALL_STAFF2], staffPreference: { kind: 'staff', staffId: 'staff2' } }),
    );
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.staffId === 'staff2')).toBe(true);
  });

  it("a parità di carico vince l'ordine (sortOrder), poi l'id", () => {
    const a = staff('bravo', 1),
      b = staff('alfa', 1),
      c = staff('zeta', 0);
    expect(computeAvailability(input({ staff: [a, b, c] }))[0]!.staffId).toBe('zeta');
    expect(computeAvailability(input({ staff: [a, b] }))[0]!.staffId).toBe('alfa');
  });

  it('orari stagionali: le fasce valgono solo nel loro periodo (validFrom/validTo)', () => {
    const summer = week([2], '08:00', '14:00', { validFrom: '2026-06-01', validTo: '2026-09-30' });
    const winter = week([2], '10:00', '18:00', { validFrom: '2026-10-01' });
    const hours = [...summer, ...winter];
    const slots = computeAvailability(input({ locationHours: hours, staff: [staff('arturo', 0, hours)] }));
    expect(localHM(slots[0]!.start)).toBe('10:00');
    const july = computeAvailability(
      input({
        locationHours: hours,
        staff: [staff('arturo', 0, hours)],
        now: at('2026-07-06T08:00'),
        from: '2026-07-07',
        to: '2026-07-07',
      }),
    );
    expect(localHM(july[0]!.start)).toBe('08:00');
    expect(localHM(july.at(-1)!.start)).toBe('13:30');
  });

  it("fattore di durata: un operatore al 120 % impiega 30' per un taglio da 25'", () => {
    const lento = staff('lento', 0, undefined, { taglio: 120 });
    const [first] = computeAvailability(input({ staff: [lento] }));
    expect((first!.end - first!.start) / 60_000).toBe(30);
  });
});

describe('computeAvailability — ora legale (E3)', () => {
  const night = (weekday: 7) => week([weekday], '01:00', '05:00');

  it("29/03/2026 (salto avanti): nessuno slot nell'ora inesistente, durate reali corrette", () => {
    const slots = computeAvailability(
      input({
        services: [MEZZORA],
        locationHours: night(7),
        staff: [staff('arturo', 0, night(7))],
        now: at('2026-03-28T08:00'),
        from: '2026-03-29',
        to: '2026-03-29',
      }),
    );
    const s = starts(slots);
    expect(s.some((x) => x.startsWith('02:'))).toBe(false);
    expect(s).toContain('01:45');
    expect(s).toContain('03:00');
    const a = slots.find((x) => localHM(x.start) === '01:45')!;
    const b = slots.find((x) => localHM(x.start) === '03:00')!;
    expect((b.start - a.start) / 60_000).toBe(15); // 01:45 CET → 03:00 CEST sono 15 minuti reali
    expect((a.end - a.start) / 60_000).toBe(30);
    expect(localHM(a.end)).toBe('03:15'); // 30 minuti reali dopo le 01:45 CET
  });

  it("25/10/2026 (salto indietro): nessuno slot nell'ora ripetuta", () => {
    const slots = computeAvailability(
      input({
        services: [MEZZORA],
        locationHours: night(7),
        staff: [staff('arturo', 0, night(7))],
        now: at('2026-10-24T08:00'),
        from: '2026-10-25',
        to: '2026-10-25',
      }),
    );
    const s = starts(slots);
    expect(s.some((x) => x.startsWith('02:'))).toBe(false);
    expect(s).toContain('01:00');
    expect(s).toContain('03:00');
    for (const x of slots) expect((x.end - x.start) / 60_000).toBe(30);
  });
});

describe('computeAvailability — validazione', () => {
  it('rifiuta intervalli oltre 31 giorni, date invertite o non valide, granularità impossibili', () => {
    expect(() => computeAvailability(input({ to: '2026-12-10' }))).toThrow(RangeError);
    expect(() => computeAvailability(input({ from: '2026-11-05', to: '2026-11-03' }))).toThrow(RangeError);
    expect(() => computeAvailability(input({ from: '2026-02-30' }))).toThrow(RangeError);
    expect(() =>
      computeAvailability(input({ policy: { slotGranularityMin: 7, minNoticeMin: 0, maxAdvanceDays: 10 } })),
    ).toThrow(RangeError);
    expect(() => computeAvailability(input({ services: [] }))).toThrow(RangeError);
    expect(() => computeAvailability(input({ services: [PIEGA], pools: [] }))).toThrow(RangeError);
  });
});
