'use client';

import { useEffect } from 'react';
import { isInViewport, prefersReducedMotion, whenIdle } from '../lib/motion';

/**
 * Animazioni d'ingresso e micro-interazioni della pagina (docs/08 §3):
 * - titoli `[data-reveal="title"]`: SplitText per righe dentro una maschera; il nome accessibile resta il testo intero
 *   (`aria: 'auto'`) e a fine animazione il DOM torna com'era (`revert`);
 * - foto `[data-reveal="media"]`: salgono e si assestano quando entrano nel viewport;
 * - pulsanti `.button`: effetto magnetico, solo con puntatore fine (mouse, trackpad).
 *
 * Parte a browser inattivo e solo senza `prefers-reduced-motion`. Gli elementi già visibili al caricamento non si
 * animano. Solo `transform` e `opacity`. Senza JavaScript il contenuto è identico. Rende null.
 */
export function MotionLayer() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const start = async () => {
      const [{ gsap }, { ScrollTrigger }, { SplitText }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
        import('gsap/SplitText'),
        // Le righe si calcolano col font definitivo, altrimenti gli a capo sarebbero sbagliati.
        document.fonts.ready,
      ]);
      const main = document.getElementById('main');
      if (cancelled || main === null) return;
      gsap.registerPlugin(ScrollTrigger, SplitText);

      const ctx = gsap.context(() => {
        const mm = gsap.matchMedia();

        mm.add('(prefers-reduced-motion: no-preference)', () => {
          for (const el of gsap.utils.toArray<HTMLElement>('[data-reveal="title"]')) {
            if (isInViewport(el)) continue;
            const split = SplitText.create(el, { type: 'lines', mask: 'lines', aria: 'auto' });
            gsap.from(split.lines, {
              yPercent: 105,
              duration: 0.9,
              ease: 'power3.out',
              stagger: 0.08,
              scrollTrigger: { trigger: el, start: 'top 88%', once: true },
              onComplete: () => {
                split.revert();
              },
            });
          }
          for (const el of gsap.utils.toArray<HTMLElement>('[data-reveal="media"]')) {
            if (isInViewport(el)) continue;
            gsap.from(el, {
              y: 48,
              opacity: 0,
              duration: 1,
              ease: 'power3.out',
              scrollTrigger: { trigger: el, start: 'top 90%', once: true },
            });
          }
        });

        mm.add('(prefers-reduced-motion: no-preference) and (pointer: fine)', () => {
          const detach: (() => void)[] = [];
          for (const button of gsap.utils.toArray<HTMLElement>('.button')) {
            const x = gsap.quickTo(button, 'x', { duration: 0.5, ease: 'power3' });
            const y = gsap.quickTo(button, 'y', { duration: 0.5, ease: 'power3' });
            const onMove = (e: PointerEvent) => {
              const r = button.getBoundingClientRect();
              x((e.clientX - r.left - r.width / 2) * 0.25);
              y((e.clientY - r.top - r.height / 2) * 0.35);
            };
            const onLeave = () => {
              x(0);
              y(0);
            };
            button.addEventListener('pointermove', onMove, { passive: true });
            button.addEventListener('pointerleave', onLeave);
            detach.push(() => {
              button.removeEventListener('pointermove', onMove);
              button.removeEventListener('pointerleave', onLeave);
            });
          }
          return () => {
            for (const off of detach) off();
          };
        });
      }, main);

      cleanup = () => {
        ctx.revert();
      };
    };

    const cancelIdle = whenIdle(() => void start());
    return () => {
      cancelled = true;
      cancelIdle();
      cleanup?.();
    };
  }, []);

  return null;
}
