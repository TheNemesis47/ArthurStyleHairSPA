import { buildStrands } from '../lib/strands';
import { StrandsMotion } from './StrandsMotion';

const STRANDS = buildStrands();
const main = STRANDS.filter((s) => s.group === 'main');
const top = STRANDS.filter((s) => s.group === 'top');

/**
 * Le ciocche del logo, vive (docs/08 §3). Componente SERVER: l'SVG arriva già nell'HTML e non viene idratato.
 * - Apertura: un velo color carta scorre via (solo transform → compositor, niente lavoro sul thread principale).
 * - GSAP (caricato a riposo da StrandsMotion): le ciocche seguono il puntatore e si aprono durante lo scroll.
 * - prefers-reduced-motion: niente velo, niente GSAP; le linee sono ferme e complete.
 */
export function HeroStrands() {
  return (
    <div className="strands" aria-hidden="true">
      <div className="strands-sway">
        <div className="strands-layer strands-main">
          <StrandsSvg paths={main} opacity={0.42} id="m" />
        </div>
        <div className="strands-layer strands-top">
          <StrandsSvg paths={top} opacity={0.24} id="t" />
        </div>
      </div>
      <div className="strands-veil" />
      <StrandsMotion />
    </div>
  );
}

function StrandsSvg({
  paths,
  opacity,
  id,
}: {
  paths: readonly { d: string; index: number }[];
  opacity: number;
  id: string;
}) {
  return (
    <svg viewBox="0 0 910 589" preserveAspectRatio="none" focusable="false">
      <defs>
        <linearGradient id={`fade-${id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
        <mask id={`mask-${id}`} maskUnits="userSpaceOnUse" x="-40" y="-40" width="1000" height="680">
          <rect x="-40" y="-40" width="1000" height="680" fill={`url(#fade-${id})`} />
        </mask>
      </defs>
      <g mask={`url(#mask-${id})`} strokeOpacity={opacity}>
        {paths.map((s) => (
          <path key={s.index} d={s.d} />
        ))}
      </g>
    </svg>
  );
}
