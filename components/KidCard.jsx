/* One child's day. Server-rendered — nothing here is interactive.
   The uniform answer is the payload; everything else is supporting detail. */
export default function KidCard({ b }) {
  return (
    <div
      className="card kid"
      style={{
        '--fh-tint': `var(--fh-${b.tint}-slab)`,
        '--fh-slab-ink': `var(--fh-${b.tint}-slab-ink)`,
      }}
    >
      <div className="kid__slab" style={{ background: 'var(--fh-tint)' }}>
        <span className="kid__who">{b.name} · Year {b.year}</span>
        <span className="kid__uniform">{b.uniformLabel}</span>
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
    </div>
  );
}
