import { derive } from '@/lib/hubIcon';

/* Below this size, the studio's heavier effects (long shadow, glow, stack,
 * a hollow outline) read as mud rather than style — a stack of 1px offsets
 * just disappears, and outline's hairline stroke goes illegible. Falling
 * back to a flat fill keeps the letter/mark readable at avatar-row (52px)
 * and avatar-inline (28px) sizes without every call site having to know
 * to ask for it. Wall-sized avatars (80px) and the icon studio's own
 * previews (96px+) are unaffected. */
const SIMPLIFY_BELOW = 62;

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
