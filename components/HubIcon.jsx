import { derive } from '@/lib/hubIcon';

/* Below this size, the studio's heavier effects (long shadow, glow, stack,
 * a hollow outline) stop reading as style. It's not just legibility at
 * tiny sizes — checked by rendering "long" at 80px next to a flattened
 * version: the effect is built from ~18 text-shadow copies each offset
 * a fraction of a CSS pixel apart, so it reads as a crisp diagonal trail
 * at app-icon scale (1024px) but the sub-pixel offsets just blur together
 * at avatar scale, which is exactly the "looks a bit soft" symptom on the
 * wall strip (80px). Falling back to a flat fill covers every real
 * placement — wall (80px), row (52px), inline (28px) — without every call
 * site having to know to ask for it. Only the studios' own large hero
 * preview (160px) and the actual rasterized icon (512/1024px) are above
 * this and keep full effects, where they were designed to be seen. */
const SIMPLIFY_BELOW = 110;

/* Renders one icon tile from a config — used for preset swatches, the live
 * studio preview, the home-screen mock, and person avatars. `flat` drops
 * the drop shadow (dock/tray icons, and inline avatars, don't get one). */
export default function HubIcon({ icon, size = 120, flat = false }) {
  const px = Number(size) || 120;
  const raw = derive(icon);
  const d = px < SIMPLIFY_BELOW
    ? Object.assign({}, raw, { shadow: 'none', filter: 'none', stroke: '0 transparent', color: raw.fg, gloss: false })
    : raw;
  const lift = flat ? 'none' : `0 ${Math.max(1, px * .02)}px ${Math.max(2, px * .06)}px rgba(20,20,48,.22)`;

  return (
    <div
      style={{
        position: 'relative', width: px, height: px, fontSize: px, flex: 'none',
        borderRadius: d.radius, background: d.bg, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: lift,
      }}
    >
      {d.isType && (
        <span
          style={{
            display: 'block', fontFamily: d.family, fontWeight: d.weight, fontSize: `${d.fsize}em`,
            lineHeight: 1, color: d.color, textShadow: d.shadow, WebkitTextStroke: d.stroke,
            letterSpacing: d.track, transform: `translateY(${d.dy}em)`, whiteSpace: 'nowrap',
          }}
        >
          {d.text}
        </span>
      )}
      {d.isMark && (
        <svg viewBox="0 0 100 100" style={{ width: '72%', height: '72%', overflow: 'visible', filter: d.filter }}>
          <path d={d.path} fill="none" stroke={d.fg} strokeWidth={d.sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {d.gloss && (
        <div
          style={{
            position: 'absolute', left: 0, right: 0, top: 0, height: '50%', pointerEvents: 'none',
            background: 'linear-gradient(180deg, rgba(255,255,255,.35), rgba(255,255,255,0))',
          }}
        />
      )}
    </div>
  );
}
