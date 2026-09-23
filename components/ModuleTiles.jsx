import Link from 'next/link';
import { Hammer, ChartLineDown, Receipt, Tent, CaretRight } from '@phosphor-icons/react/ssr';

/* Projects, Spending, Register and Holidays are all live now: see
   docs/family-hub-projects-module-brief.md, "4. Screen one",
   docs/family-hub-spending-scorecard-brief.md, "1. Dashboard tile",
   docs/family-hub-design-brief.md §7.2/§8, and §7.6. The answer leads and
   the module name is last and smallest: nobody scanning a fridge is
   looking for a module. Calm and attention differ by wash + accent only —
   that's a dashboard-level convention, distinct from Projects' own
   screens, which deliberately never use it (see app/globals.css). */
export default function ModuleTiles({ projectsTile, spendingTile, registerTile, holidayTile }) {
  return (
    <div className="tiles">
      <Link
        href="/projects"
        className={`tile tile--live${projectsTile?.attention ? ' tile--attention' : ''}`}
      >
        <Hammer size={22} className="tile__icon" />
        <span className="tile__answer">{projectsTile?.line ?? 'Not set up yet'}</span>
        <span className="tile__name">Projects</span>
        <CaretRight size={16} className="tile__chevron" />
      </Link>

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
