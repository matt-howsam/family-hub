import Link from 'next/link';

/* The home slot: up to three upcoming household events, real Home calendar
   data. Tapping it opens the full What's On listing — navigation, not a
   write. Theirs are on a child's own card, so the same activity never
   appears twice on one screen; the caller drops anything already shown
   there today. */
export default function WhatsOn({ items }) {
  if (!items.length) return null;
  return (
    <Link className="whats-on" href="/whats-on">
      <div className="whats-on__label">What&rsquo;s on</div>
      {items.map((e) => (
        <div className="whats-on__row" key={e.uid}>
          <span className="whats-on__when">{e.when}</span>
          <span className="whats-on__sep"> · </span>
          {e.label}
        </div>
      ))}
    </Link>
  );
}
