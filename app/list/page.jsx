import { getOpenShop, getList, getStores, getCategories, getBin } from '@/lib/shoppinglist';
import ShoppingListScreen from '@/components/ShoppingListScreen';

/* Shopping gets no stale list. The one shopping-list surface for every
   device — see docs/DECISIONS.md, 29 October 2026. */
export const dynamic = 'force-dynamic';

export default async function ShoppingListPage() {
  const [stores, shop, categories, bin] = await Promise.all([
    getStores(), getOpenShop(), getCategories(), getBin(),
  ]);
  const list = await getList(shop?.id);

  return <ShoppingListScreen stores={stores} initialList={list} categories={categories} bin={bin} />;
}
