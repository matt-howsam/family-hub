import {
  UnifrakturMaguntia, Sedgwick_Ave_Display, Rubik_Wet_Paint, Permanent_Marker,
  Bungee, Monoton, Alfa_Slab_One, Pacifico, Saira_Stencil_One, Rubik_Bubbles, Silkscreen,
} from 'next/font/google';

/* One loader per decorative font the icon studio offers — see
 * lib/hubIcon.js#FONTS, which references these by CSS variable rather
 * than by name. Self-hosted via next/font, the same as Plus Jakarta Sans
 * in app/layout.jsx, rather than a runtime Google Fonts <link>: no
 * dependency on fonts.googleapis.com staying reachable from a
 * wall-mounted kiosk that's on 24/7.
 *
 * Loaded globally (applied on <html> in layout.jsx), not just on the
 * studio pages — a saved avatar can use any of these, and avatars render
 * on the wall strip and on every person's own page, not only in Settings. */
const blackletter = UnifrakturMaguntia({ weight: '400', subsets: ['latin'], variable: '--font-blackletter', display: 'swap' });
const graffiti = Sedgwick_Ave_Display({ weight: '400', subsets: ['latin'], variable: '--font-graffiti', display: 'swap' });
const drip = Rubik_Wet_Paint({ weight: '400', subsets: ['latin'], variable: '--font-drip', display: 'swap' });
const marker = Permanent_Marker({ weight: '400', subsets: ['latin'], variable: '--font-marker', display: 'swap' });
const block = Bungee({ weight: '400', subsets: ['latin'], variable: '--font-block', display: 'swap' });
const neon = Monoton({ weight: '400', subsets: ['latin'], variable: '--font-neon', display: 'swap' });
const slab = Alfa_Slab_One({ weight: '400', subsets: ['latin'], variable: '--font-slab', display: 'swap' });
const script = Pacifico({ weight: '400', subsets: ['latin'], variable: '--font-script', display: 'swap' });
const stencil = Saira_Stencil_One({ weight: '400', subsets: ['latin'], variable: '--font-stencil', display: 'swap' });
const bubble = Rubik_Bubbles({ weight: '400', subsets: ['latin'], variable: '--font-bubble', display: 'swap' });
const pixel = Silkscreen({ weight: '700', subsets: ['latin'], variable: '--font-pixel', display: 'swap' });

export const STUDIO_FONT_VARS = [
  blackletter.variable, graffiti.variable, drip.variable, marker.variable, block.variable,
  neon.variable, slab.variable, script.variable, stencil.variable, bubble.variable, pixel.variable,
].join(' ');
