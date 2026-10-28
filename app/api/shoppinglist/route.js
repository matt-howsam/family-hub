import { NextResponse } from 'next/server';
import { getSession } from '@/lib/identity';
import {
  addAdhocItem, setEntryStatus, deleteEntry, restoreEntry, clearChecked,
  startNewShop, resolveLeftover, createStore, archiveStore, restoreStore,
  createCategory, renameCategory,
} from '@/lib/shoppinglist';

const ok = (extra) => NextResponse.json({ ok: true, ...extra });
const badRequest = (error) => NextResponse.json({ error }, { status: 400 });

/* Shopping list is a family-register module (docs/identity.md, "Amended
   26 October 2026") — role = 'display' (the bench iPad) may write here,
   unlike a household-register module. Every write below is open to any
   session; there's no adult/child distinction for a shared shopping list. */
export async function POST(request) {
  const session = await getSession();
  const body = await request.json().catch(() => ({}));

  switch (body.action) {
    case 'add': {
      if (!body.storeId) return badRequest('storeId required');
      const result = await addAdhocItem(body.name ?? '', body.storeId, session?.person ?? null, body.categoryId ?? null);
      if (!result.ok) return badRequest(result.error ?? 'could not add item');
      return ok(result);
    }

    case 'addStore': {
      if (!body.name) return badRequest('name required');
      const store = await createStore(body.name);
      if (!store) return badRequest('could not add store');
      return ok({ store });
    }

    case 'removeStore': {
      if (!body.id) return badRequest('id required');
      const store = await archiveStore(body.id);
      if (!store) return badRequest('store still has items, or could not remove');
      return ok({ store });
    }

    case 'restoreStore': {
      if (!body.id) return badRequest('id required');
      const store = await restoreStore(body.id);
      if (!store) return badRequest('could not restore store');
      return ok({ store });
    }

    case 'setStatus':
      if (!body.id || !['needed', 'have', 'bought'].includes(body.status)) {
        return badRequest('id and a valid status are required');
      }
      await setEntryStatus(body.id, body.status);
      return ok();

    case 'delete':
      if (!body.id) return badRequest('id required');
      await deleteEntry(body.id);
      return ok();

    case 'restore':
      if (!body.id) return badRequest('id required');
      await restoreEntry(body.id);
      return ok();

    case 'clearChecked': {
      if (!['needed', 'have', 'bought'].includes(body.status)) return badRequest('valid status required');
      const cleared = await clearChecked(body.status, body.storeId ?? null);
      return ok({ cleared });
    }

    case 'startShop': {
      const { leftovers, newShopId } = await startNewShop();
      return ok({ leftovers, newShopId });
    }

    case 'resolveLeftover':
      if (!body.id || !['keep', 'drop'].includes(body.resolution)) {
        return badRequest('id and a resolution of keep or drop are required');
      }
      await resolveLeftover(body.id, body.resolution);
      return ok();

    case 'addCategory': {
      if (!body.name) return badRequest('name required');
      const category = await createCategory(body.name);
      if (!category) return badRequest('could not add category');
      return ok({ category });
    }

    case 'renameCategory': {
      if (!body.id || !body.name) return badRequest('id and name are required');
      const category = await renameCategory(body.id, body.name);
      if (!category) return badRequest('could not rename category');
      return ok({ category });
    }

    default:
      return badRequest('unknown action');
  }
}
