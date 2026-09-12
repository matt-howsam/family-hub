import Link from 'next/link';
import { TShirt } from '@phosphor-icons/react/ssr';

/* One child's day. Tapping it opens their own view — the same destination
   as their avatar (docs/family-hub-whats-on-person-views-brief.md,
   "one destination per person"). Navigation only, never a write. A plain
   <a> here forces a full page reload; Link keeps it a client transition,
   which is most of the "returning home feels slow" complaint. */
export default function KidCard({ b }) {
  return (
    <Link
      href={`/people/${b.id}`}
      className="card kid"
      style={{
        '--fh-tint': `var(--fh-${b.tint}-slab)`,
        '--fh-slab-ink': `var(--fh-${b.tint}-slab-ink)`,
      }}
    >
      <div className="kid__slab" style={{ background: 'var(--fh-tint)' }}>
        <span className="kid__who">{b.name} · Year {b.year}</span>
        <div>
          <TShirt size={30} className="kid__icon" />
          <span className="kid__uniform">{b.uniformLabel}</span>
        </div>
      </div>
      <div className="kid__body">
        {b.headline && <div className="kid__answer">{b.headline}</div>}
        {b.bring && <div className="kid__note">{b.bring}</div>}
        {b.after && (
          <div className="kid__after">
            <div className="row__meta">After school</div>
            <div className="kid__answer" style={{ marginTop: 'var(--fh-space-2)' }}>
              {b.after}
            </div>
          </div>
        )}
        {!b.headline && !b.bring && !b.after && (
          <div className="kid__note">Ordinary day. Nothing to bring.</div>
        )}
      </div>
    </Link>
  );
}
