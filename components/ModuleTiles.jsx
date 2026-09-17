import Link from 'next/link';
import { Hammer, ChartLineDown, Receipt, Tent, CaretRight } from '@phosphor-icons/react/ssr';

/* Placeholder until the projects, register and holidays modules ship —
   each will replace one line here with a live query. Spending is the
   first to go live: see docs/family-hub-spending-scorecard-brief.md,
   "1. Dashboard tile". The answer leads and the module name is last and
   smallest: nobody scanning a fridge is looking for a module. Calm and
   attention differ by wash + accent only. */
const STATIC_TILES = {
  Projects: { icon: Hammer, attention: true, answer: '7 stalled · kitchen longest at 142 days' },
  Register: { icon: Receipt, answer: 'Nothing renews for 7 weeks', accent: ' · $1,449 saved' },
  Holidays: { icon: Tent, answer: 'Straddie in 30 weeks' },
};

function StaticTile({ name }) {
  const { icon: Icon, answer, accent, attention } = STATIC_TILES[name];
  return (
    <div className={`tile${attention ? ' tile--attention' : ''}`}>
      <Icon size={22} className="tile__icon" />
      <span className="tile__answer">
        {answer}
        {accent && <span className="tile__accent">{accent}</span>}
      </span>
      <span className="tile__name">{name}</span>
    </div>
  );
}

export default function ModuleTiles({ spendingTile }) {
  return (
    <div className="tiles">
      <StaticTile name="Projects" />

      {/* The only live tile so far, and the only one that links anywhere —
          per the chevron-is-the-only-affordance rule, a tile with nowhere
          to go gets no chevron. */}
      <Link
        href="/scorecard"
        className={`tile tile--live${spendingTile?.attention ? ' tile--attention' : ''}`}
      >
        <ChartLineDown size={22} className="tile__icon" />
        <span className="tile__answer">
          {spendingTile?.line1 ?? 'Not entered yet'}
          {spendingTile?.line2 && <span className="tile__answer2">{spendingTile.line2}</span>}
        </span>
        <span className="tile__name">Spending</span>
        <CaretRight size={16} className="tile__chevron" />
      </Link>

      <StaticTile name="Register" />
      <StaticTile name="Holidays" />
    </div>
  );
}
