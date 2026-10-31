import localFont from 'next/font/local';

/** Jost variabile (SIL OFL 1.1), sottoinsieme latino + latino esteso A (anche ċ ġ ħ ż per Malta), servito dal nostro dominio. */
export const jost = localFont({
  src: '../fonts/jost-latin-var.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-jost',
  fallback: ['system-ui', 'sans-serif'],
});
