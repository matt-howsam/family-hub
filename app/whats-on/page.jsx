import { getWhatsOn, groupForListing } from '@/lib/whatson';
import { today, TZ } from '@/lib/week';
import { getRole } from '@/lib/role';
import WhatsOnScreen from '@/components/WhatsOnScreen';

/* Same reasoning as the wall: this never sleeps, so nothing here is cached. */
export const dynamic = 'force-dynamic';

export default async function WhatsOnPage() {
  const calendarToday = today(TZ);
  const [{ entries, stale, fetchedAt }, role] = await Promise.all([
    getWhatsOn({ from: calendarToday, days: 21 }),
    getRole(),
  ]);
  const groups = groupForListing(entries, { calendarToday });

  return (
    <WhatsOnScreen
      groups={groups}
      stale={stale}
      fetchedAt={fetchedAt ? fetchedAt.toISOString() : null}
      empty={entries.length === 0}
      fridge={role === 'display'}
    />
  );
}
