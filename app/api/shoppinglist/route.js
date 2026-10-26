import { NextResponse } from 'next/server';
import { getSession } from '@/lib/identity';
import {
  addAdhocItem, setEntryStatus, deleteEntry, restoreEntry,
  startNewShop, resolveLeftover,
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
      const result = await addAdhocItem(body.name ?? '', body.storeId ?? null, session?.person ?? null);
      if (!result.ok) return result.needsStore ? ok(result) : badRequest(result.error ?? 'could not add item');
      return ok(result);
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

    default:
      return badRequest('unknown action');
  }
}
