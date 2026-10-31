'use client';

import { useEffect, useRef } from 'react';

/**
 * Movimento delle ciocche con GSAP, caricato SOLO a browser inattivo e solo se l'utente non chiede movimento ridotto:
 * zero costo sul caricamento iniziale (budget docs/08 §4). Le trasformazioni sono su contenitori HTML (compositor).
 * Rende null: il markup delle ciocche è server-side (HeroStrands).
 */
export function StrandsMotion() {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = anchor.current?.closest('.strands');
    const hero = root?.closest('.hero');
    if (!(root instanceof HTMLElement) || !(hero instanceof HTMLElement)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;
    const start = async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        const mm = gsap.matchMedia();
        mm.add('(prefers-reduced-motion: no-preference)', () => {
          const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 };
          gsap.to('.strands-main', {
            yPercent: -8,
            scaleY: 1.15,
            transformOrigin: '0% 50%',
            ease: 'none',
            scrollTrigger: st,
          });
          gsap.to('.strands-top', { yPercent: -14, ease: 'none', scrollTrigger: { ...st } });
        });
        mm.add('(prefers-reduced-motion: no-preference) and (pointer: fine)', () => {
          const moveX = gsap.quickTo('.strands-sway', 'x', { duration: 1.2, ease: 'power3' });
          const moveY = gsap.quickTo('.strands-sway', 'y', { duration: 1.2, ease: 'power3' });
          const onMove = (e: PointerEvent) => {
            const r = hero.getBoundingClientRect();
            moveX(((e.clientX - r.left) / r.width - 0.5) * 24);
            moveY(((e.clientY - r.top) / r.height - 0.5) * 16);
          };
          hero.addEventListener('pointermove', onMove, { passive: true });
          return () => {
            hero.removeEventListener('pointermove', onMove);
          };
        });
      }, root);
      cleanup = () => {
        ctx.revert();
      };
    };

    const hasIdle = typeof window.requestIdleCallback === 'function';
    const handle = hasIdle
      ? window.requestIdleCallback(() => void start(), { timeout: 2500 })
      : window.setTimeout(() => void start(), 1200);
    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
      cleanup?.();
    };
  }, []);

  return <span ref={anchor} hidden />;
}
