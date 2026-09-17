import { redirect } from 'next/navigation';
import { getBudgetAndEvents } from '@/lib/scorecard';
import { getSession } from '@/lib/identity';
import BudgetScreen from '@/components/BudgetScreen';

/* Budget and events are configuration, not content — same "must never
   require a deploy" rule as term dates and chore rates. Adult-only per
   docs/identity.md's roles table (a child's write scope doesn't reach the
   scorecard at all); enforced again in app/api/scorecard/route.js, which
   is the actual boundary. */
export const dynamic = 'force-dynamic';

export default async function BudgetPage({ searchParams }) {
  const params = await searchParams;
  const session = await getSession();
  if (!session || session.role !== 'adult') redirect('/scorecard');

  const year = Number(params?.year) || undefined;
  const data = await getBudgetAndEvents(year);

  return <BudgetScreen data={data} />;
}
