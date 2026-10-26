import { getOpenShop, getList, getStores } from '@/lib/shoppinglist';
import ShoppingListScreen from '@/components/ShoppingListScreen';

/* Shopping gets no stale list. See the brief's "Where the list lives" —
   this is the phone surface; the iPad panel lives inside the planner. */
export const dynamic = 'force-dynamic';

export default async function ShoppingListPage() {
  const [stores, shop] = await Promise.all([getStores(), getOpenShop()]);
  const list = await getList(shop?.id);

  return <ShoppingListScreen stores={stores} initialList={list} />;
}
