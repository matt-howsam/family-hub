import { redirect } from 'next/navigation';
import { getEntryData } from '@/lib/scorecard';
import { getSession } from '@/lib/identity';
import { today, TZ } from '@/lib/week';
import EntryScreen from '@/components/EntryScreen';

/* Entry has no fridge exception — see docs/family-hub-spending-scorecard-brief.md,
   surface 3: "Sunday entry — phone only." Unlike the meal planner's chore-tick
   carve-out, there is no case for an eleven-figure money form on the wall. */
export const dynamic = 'force-dynamic';

/** Same fixed day-of-month bounds as lib/week.js#spendWeeksOf — 1–7, 8–14,
    15–21, 22–end — so today's week is known without a DB round trip. */
function currentWeekNoOf(now) {
  const day = now.getUTCDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

export default async function EntryPage({ searchParams }) {
  const params = await searchParams;
  const session = await getSession();
  if (!session || session.role === 'display') redirect('/scorecard');

  const weekNo = Number(params?.week) || currentWeekNoOf(today(TZ));
  const data = await getEntryData(weekNo);

  return <EntryScreen data={data} weekNo={weekNo} />;
}
