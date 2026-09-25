import { derive } from '@/lib/hubIcon';

/* Renders one icon tile from a config — used for preset swatches, the live
 * studio preview, and the home-screen mock. `flat` drops the drop shadow
 * (dock/tray icons don't get one). */
export default function HubIcon({ icon, size = 120, flat = false }) {
  const px = Number(size) || 120;
  const d = derive(icon);
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
