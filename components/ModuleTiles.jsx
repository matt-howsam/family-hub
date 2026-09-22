import Link from 'next/link';
import { Hammer, ChartLineDown, Receipt, Tent, CaretRight } from '@phosphor-icons/react/ssr';

/* Placeholder until the projects and register modules ship — each will
   replace one line here with a live query. Spending and Holidays are live:
   see docs/family-hub-spending-scorecard-brief.md, "1. Dashboard tile",
   and docs/family-hub-design-brief.md §7.6. The answer leads and the
   module name is last and smallest: nobody scanning a fridge is looking
   for a module. Calm and attention differ by wash + accent only. */
const STATIC_TILES = {
  Projects: { icon: Hammer, attention: true, answer: '7 stalled · kitchen longest at 142 days' },
  Register: { icon: Receipt, answer: 'Nothing renews for 7 weeks', accent: ' · $1,449 saved' },
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

export default function ModuleTiles({ spendingTile, holidayTile }) {
  return (
    <div className="tiles">
      <StaticTile name="Projects" />

      {/* Both link out, per the chevron-is-the-only-affordance rule — a
          tile with nowhere to go gets no chevron, and now both do. */}
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

      <Link
        href="/holidays"
        className={`tile tile--live${holidayTile?.attention ? ' tile--attention' : ''}`}
      >
        <Tent size={22} className="tile__icon" />
        <span className="tile__answer">{holidayTile?.line ?? 'Nothing planned yet'}</span>
        <span className="tile__name">Holidays</span>
        <CaretRight size={16} className="tile__chevron" />
      </Link>
    </div>
  );
}
