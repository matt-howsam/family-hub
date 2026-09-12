import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react/ssr';

/* The home slot: up to three upcoming household events, real Home calendar
   data. Tapping it opens the full What's On listing — navigation, not a
   write. Theirs are on a child's own card, so the same activity never
   appears twice on one screen; the caller drops anything already shown
   there today. A card surface with a chevron, not a recessed grey panel —
   the chevron is the fridge's one tap affordance, so it's what says this
   is an object rather than a background. */
export default function WhatsOn({ items }) {
  if (!items.length) return null;
  return (
    <Link className="whats-on" href="/whats-on">
      <div className="whats-on__header">
        <span className="whats-on__label">What&rsquo;s on</span>
        <CaretRight size={18} className="whats-on__chevron" />
      </div>
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
