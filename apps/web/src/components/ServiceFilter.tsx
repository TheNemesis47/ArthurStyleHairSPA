'use client';

import { useRef, useState, type ReactNode } from 'react';
import type { CategoryKey } from '../content/listino';
import { prefersReducedMotion } from '../lib/motion';

type Choice = CategoryKey | 'all';

/**
 * Filtro del listino per categoria. Le categorie si riordinano con GSAP Flip (docs/08 §3); con
 * `prefers-reduced-motion` il cambio è immediato. Senza JavaScript si vede l'intero listino.
 * I gruppi sono i `.price-group[data-category]` resi dal server dentro `children`.
 */
export function ServiceFilter({
  options,
  allLabel,
  groupLabel,
  status,
  children,
}: {
  options: readonly { key: CategoryKey; label: string }[];
  allLabel: string;
  groupLabel: string;
  /** Testo annunciato agli screen reader dopo ogni scelta, già tradotto (es. "4 servizi: Colore"). */
  status: Readonly<Record<Choice, string>>;
  children: ReactNode;
}) {
  const [active, setActive] = useState<Choice>('all');
  const [announced, setAnnounced] = useState('');
  const list = useRef<HTMLDivElement>(null);
  const running = useRef<{ progress: (value: number) => unknown } | null>(null);

  const select = async (next: Choice) => {
    const root = list.current;
    if (next === active || root === null) return;
    setActive(next);
    setAnnounced(status[next]);
    const groups = Array.from(root.querySelectorAll<HTMLElement>('.price-group'));
    const apply = () => {
      for (const g of groups) {
        const shown = next === 'all' || g.getAttribute('data-category') === next;
        g.style.display = shown ? '' : 'none';
      }
    };
    if (prefersReducedMotion()) {
      apply();
      return;
    }
    const [{ gsap }, { Flip }] = await Promise.all([import('gsap'), import('gsap/Flip')]);
    gsap.registerPlugin(Flip);
    // Stato attuale (anche a metà di un'animazione precedente), poi chiudo quella precedente.
    const before = root.offsetHeight;
    const state = Flip.getState(groups);
    running.current?.progress(1);
    apply();
    const after = root.offsetHeight;
    const timeline = Flip.from(state, {
      duration: 0.55,
      ease: 'power2.inOut',
      absolute: true,
      onEnter: (els) =>
        gsap.fromTo(els, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.45, delay: 0.1 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, duration: 0.25 }),
    });
    // Durante Flip i gruppi sono in posizione assoluta: senza questo il listino si accorcerebbe di colpo e il resto
    // della pagina salterebbe. L'altezza passa invece da quella vecchia alla nuova insieme alle categorie.
    timeline.fromTo(
      root,
      { height: before },
      { height: after, duration: 0.55, ease: 'power2.inOut', clearProps: 'height' },
      0,
    );
    running.current = timeline;
  };

  const choices: { key: Choice; label: string }[] = [{ key: 'all', label: allLabel }, ...options];
  return (
    <>
      <div className="filter" role="group" aria-label={groupLabel}>
        {choices.map((c) => (
          <button
            key={c.key}
            type="button"
            className="chip"
            aria-pressed={active === c.key}
            onClick={() => {
              void select(c.key);
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      <p className="visually-hidden" aria-live="polite">
        {announced}
      </p>
      <div ref={list}>{children}</div>
    </>
  );
}
