'use client';

import { useId, useState, type SyntheticEvent } from 'react';
import type { Messages } from '../i18n';

type Errors = Partial<Record<'name' | 'email' | 'consent', string>>;

/**
 * Lista d'attesa Malta — SOLO interfaccia (F3a). Nessun dato lascia il browser: l'invio arriverà con l'API (F1.6)
 * con double opt-in (docs/14). Il messaggio lo dice chiaramente: niente finte conferme.
 */
export function WaitlistForm({ m }: { m: Messages['malta'] }) {
  const id = useId();
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);

  function onSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = (key: string) => {
      const v = data.get(key);
      return typeof v === 'string' ? v.trim() : '';
    };
    const name = text('name');
    const email = text('email');
    const next: Errors = {};
    if (name.length === 0) next.name = m.errors.name;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = m.errors.email;
    if (data.get('consent') === null) next.consent = m.errors.consent;
    setErrors(next);
    setDone(Object.keys(next).length === 0);
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate aria-describedby={done ? `${id}-done` : undefined}>
      <div className="field">
        <label htmlFor={`${id}-name`}>{m.name}</label>
        <input
          id={`${id}-name`}
          name="name"
          type="text"
          autoComplete="given-name"
          aria-invalid={errors.name !== undefined}
          aria-describedby={errors.name ? `${id}-name-err` : undefined}
        />
        {errors.name ? (
          <p id={`${id}-name-err`} className="error">
            {errors.name}
          </p>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor={`${id}-email`}>{m.email}</label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={errors.email !== undefined}
          aria-describedby={errors.email ? `${id}-email-err` : undefined}
        />
        {errors.email ? (
          <p id={`${id}-email-err`} className="error">
            {errors.email}
          </p>
        ) : null}
      </div>
      <div className="field check">
        <input
          id={`${id}-consent`}
          name="consent"
          type="checkbox"
          aria-invalid={errors.consent !== undefined}
          aria-describedby={errors.consent ? `${id}-consent-err` : undefined}
        />
        <label htmlFor={`${id}-consent`} style={{ fontWeight: 400 }}>
          {m.consent}
        </label>
        {errors.consent ? (
          <p id={`${id}-consent-err`} className="error" style={{ gridColumn: '1 / -1' }}>
            {errors.consent}
          </p>
        ) : null}
      </div>
      <div>
        <button type="submit" className="button">
          {m.submit}
        </button>
      </div>
      <p id={`${id}-done`} role="status" aria-live="polite" className={done ? 'notice' : 'visually-hidden'}>
        {done ? m.preview : ''}
      </p>
    </form>
  );
}
