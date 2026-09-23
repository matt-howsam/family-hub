import Link from 'next/link';
import { Hammer, ChartLineDown, Receipt, Tent, CaretRight } from '@phosphor-icons/react/ssr';

/* Placeholder until the projects module ships — it will replace this line
   with a live query. Spending, Register and Holidays are live: see
   docs/family-hub-spending-scorecard-brief.md, "1. Dashboard tile",
   docs/family-hub-design-brief.md §7.2/§8, and §7.6. The answer leads and
   the module name is last and smallest: nobody scanning a fridge is
   looking for a module. Calm and attention differ by wash + accent only. */
const STATIC_TILES = {
  Projects: { icon: Hammer, attention: true, answer: '7 stalled · kitchen longest at 142 days' },
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

export default function ModuleTiles({ spendingTile, registerTile, holidayTile }) {
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

      <Link
        href="/register"
        className={`tile tile--live${registerTile?.attention ? ' tile--attention' : ''}`}
      >
        <Receipt size={22} className="tile__icon" />
        <span className="tile__answer">
          {registerTile?.line1 ?? 'Not set up yet'}
          {registerTile?.line2 && <span className="tile__answer2">{registerTile.line2}</span>}
        </span>
        <span className="tile__name">Register</span>
        <CaretRight size={16} className="tile__chevron" />
      </Link>

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
