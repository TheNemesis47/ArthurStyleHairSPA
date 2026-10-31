import type { Locale } from './locales';
import { en } from './messages/en';
import { it, type Messages } from './messages/it';

const dictionaries: Record<Locale, Messages> = { it, en };

export function t(locale: Locale): Messages {
  return dictionaries[locale];
}

export type { Messages };
