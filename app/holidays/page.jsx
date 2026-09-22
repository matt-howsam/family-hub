import { getSession } from '@/lib/identity';
import { getTimeline } from '@/lib/holidays';
import HolidaysScreen from '@/components/HolidaysScreen';

/* Trips get added and dates get confirmed at any time — never cache. */
export const dynamic = 'force-dynamic';

export default async function HolidaysPage() {
  const session = await getSession();
  const fridge = !session || session.role === 'display';
  const timeline = await getTimeline();

  return <HolidaysScreen timeline={timeline} fridge={fridge} role={session?.role ?? null} />;
}
