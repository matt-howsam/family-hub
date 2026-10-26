import { mondayOf, today, TZ } from '@/lib/week';
import { getWeekPlan, getLibrary } from '@/lib/mealplanner';
import { getOpenShop, getList, getStores, getBin } from '@/lib/shoppinglist';
import { getRole } from '@/lib/role';
import PlannerScreen from '@/components/PlannerScreen';

/* Dinner gets planned standing at the fridge, so this is never cached. */
export const dynamic = 'force-dynamic';

const DAY = 86400000;

export default async function PlannerPage() {
  const now = today(TZ);
  const thisMonday = mondayOf(now);
  const nextMonday = new Date(thisMonday.getTime() + 7 * DAY);
  const iso = (d) => d.toISOString().slice(0, 10);

  const [thisWeek, nextWeek, library, role, shop, stores, bin] = await Promise.all([
    getWeekPlan(thisMonday),
    getWeekPlan(nextMonday),
    getLibrary(),
    getRole(),
    getOpenShop(),
    getStores(),
    getBin(),
  ]);
  const list = await getList(shop?.id);

  // Sunday: this week has one night left, so the view opens on next week.
  const defaultWeek = now.getUTCDay() === 0 ? 'next' : 'this';

  return (
    <PlannerScreen
      todayKey={iso(now)}
      thisMonday={iso(thisMonday)}
      nextMonday={iso(nextMonday)}
      thisWeek={thisWeek}
      nextWeek={nextWeek}
      library={library}
      role={role}
      defaultWeek={defaultWeek}
      stores={stores}
      list={list}
      bin={bin}
    />
  );
}
