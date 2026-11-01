/**
 * Utilità condivise per le animazioni (docs/08 §4): GSAP si carica solo a browser inattivo e mai con
 * `prefers-reduced-motion: reduce`, così il caricamento iniziale non paga nulla.
 */

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Esegue `task` quando il browser è inattivo. Restituisce la funzione che annulla l'attesa. */
export function whenIdle(task: () => void, timeout = 2500): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(task, { timeout });
    return () => {
      window.cancelIdleCallback(id);
    };
  }
  const id = window.setTimeout(task, 1200);
  return () => {
    window.clearTimeout(id);
  };
}

/**
 * Vero se l'elemento è già (anche in parte) nel viewport. Gli elementi già visibili non si animano in ingresso:
 * farli sparire e ricomparire dopo il primo paint sarebbe un lampo fastidioso e peggiorerebbe LCP.
 */
export function isInViewport(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.top < window.innerHeight && r.bottom > 0;
}
