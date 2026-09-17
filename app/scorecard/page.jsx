import { getMonthView } from '@/lib/scorecard';
import { getSession } from '@/lib/identity';
import { today, TZ } from '@/lib/week';
import ScorecardScreen from '@/components/ScorecardScreen';

/* Money changes month to month; never cache a stale total. */
export const dynamic = 'force-dynamic';

export default async function ScorecardPage({ searchParams }) {
  const params = await searchParams;
  const session = await getSession();
  const fridge = !session || session.role === 'display';

  const now = today(TZ);
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;

  // The fridge only ever shows the live month — history browsing is a
  // phone job, per "the wall shows progress and pace, never a ledger."
  const year = fridge ? currentYear : (Number(params?.year) || currentYear);
  const month = fridge ? currentMonth : (Number(params?.month) || currentMonth);

  const view = await getMonthView(year, month);
  const canEditBudget = session?.role === 'adult';

  return (
    <ScorecardScreen
      view={view} fridge={fridge} currentYear={currentYear} currentMonth={currentMonth}
      canEditBudget={canEditBudget}
    />
  );
}
