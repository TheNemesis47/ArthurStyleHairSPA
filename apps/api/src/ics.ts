/**
 * File calendario (RFC 5545) di una prenotazione. Solo testo generato da noi o dal catalogo: ogni valore
 * passa da `escapeText` e le righe si piegano a 75 ottetti (RFC 5545 §3.1, §3.3.11).
 */
export interface IcsEvent {
  readonly uid: string;
  /** Cresce a ogni spostamento: il calendario aggiorna l'evento invece di duplicarlo. */
  readonly sequence: number;
  readonly start: number;
  readonly end: number;
  readonly stamp: number;
  readonly summary: string;
  readonly location: string;
  readonly description: string;
  readonly cancelled: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Istante in UTC nel formato base di RFC 5545: 20261103T090000Z. */
function utc(at: number): string {
  const d = new Date(at);
  return (
    `${String(d.getUTCFullYear())}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/\p{Cc}/gu, '');
}

/** Piega una riga a 75 ottetti UTF-8 senza spezzare un carattere; le continuazioni iniziano con uno spazio. */
export function fold(line: string): string {
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch, 'utf8');
    const limit = out.length === 0 ? 75 : 74; // la continuazione ha già lo spazio iniziale
    if (bytes + size > limit) {
      out.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join('\r\n ');
}

export function bookingIcs(e: IcsEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Arthur Style//Prenotazioni//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `SEQUENCE:${String(e.sequence)}`,
    `DTSTAMP:${utc(e.stamp)}`,
    `DTSTART:${utc(e.start)}`,
    `DTEND:${utc(e.end)}`,
    `SUMMARY:${escapeText(e.summary)}`,
    `LOCATION:${escapeText(e.location)}`,
    `DESCRIPTION:${escapeText(e.description)}`,
    `STATUS:${e.cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
