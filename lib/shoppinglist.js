/* ==========================================================================
   Family Hub — shopping list (Phase 1 of the Meals, Recipes & Shopping
   brief). Ad-hoc items only; recipes and meal-derived entries are Phase 2.

   Reads degrade the same way lib/mealplanner.js does: no database, or one
   that rejects the query, means an empty list — never a thrown error.
   ========================================================================== */

import { sql } from './db.js';

function norm(name) {
  return name.trim().toLowerCase();
}

/** The shop still being shopped. Creates one on first use. */
export async function getOpenShop() {
  if (!sql) return null;
  try {
    const open = await sql`
      select id, started_at as "startedAt" from shop
      where completed_at is null order by id desc limit 1`;
    if (open[0]) return open[0];
    const created = await sql`
      insert into shop default values returning id, started_at as "startedAt"`;
    return created[0];
  } catch (e) {
    console.error('getOpenShop failed:', e.message);
    return null;
  }
}

export async function getStores() {
  if (!sql) return [];
  try {
    return await sql`
      select id, name, sort_order as "sortOrder" from store
      where archived_at is null order by sort_order`;
  } catch (e) {
    console.error('getStores failed:', e.message);
    return [];
  }
}

/**
 * Removes a store once its list is empty — offered in the UI only when
 * true, but checked again here (any device could have added something in
 * the gap): refuses if a non-archived list_entry anywhere still points at
 * it, rather than silently archiving a store mid-use.
 */
export async function archiveStore(id) {
  if (!sql) return null;
  try {
    const inUse = await sql`
      select 1 from list_entry where store_id = ${id} and archived_at is null limit 1`;
    if (inUse.length) return null;
    const rows = await sql`
      update store set archived_at = now() where id = ${id}
      returning id, name, sort_order as "sortOrder"`;
    return rows[0] ?? null;
  } catch (e) {
    console.error('archiveStore failed:', e.message);
    return null;
  }
}

export async function restoreStore(id) {
  if (!sql) return null;
  try {
    const rows = await sql`
      update store set archived_at = null where id = ${id}
      returning id, name, sort_order as "sortOrder"`;
    return rows[0] ?? null;
  } catch (e) {
    console.error('restoreStore failed:', e.message);
    return null;
  }
}

/**
 * Adds a custom store (Bunnings, Kmart, ...) — seeded Coles/Aldi/Butcher
 * aren't the only options the brief describes. Case-insensitive match
 * against an existing name returns that store rather than duplicating it,
 * same reasoning as item resolution.
 */
export async function createStore(name) {
  if (!sql) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  try {
    const existing = await sql`
      select id, name, sort_order as "sortOrder" from store where lower(name) = ${trimmed.toLowerCase()}`;
    if (existing[0]) return existing[0];
    const [{ maxSort }] = await sql`select coalesce(max(sort_order), 0)::int as "maxSort" from store`;
    const rows = await sql`
      insert into store (name, sort_order) values (${trimmed}, ${maxSort + 1})
      returning id, name, sort_order as "sortOrder"`;
    return rows[0];
  } catch (e) {
    console.error('createStore failed:', e.message);
    return null;
  }
}

export async function getCategories() {
  if (!sql) return [];
  try {
    return await sql`select id, name, sort_order as "sortOrder" from category order by sort_order`;
  } catch (e) {
    console.error('getCategories failed:', e.message);
    return [];
  }
}

/**
 * Adds a custom aisle category — editable from Settings, same reasoning
 * and shape as createStore. Case-insensitive match against an existing
 * name returns that category rather than duplicating it.
 */
export async function createCategory(name) {
  if (!sql) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  try {
    const existing = await sql`
      select id, name, sort_order as "sortOrder" from category where lower(name) = ${trimmed.toLowerCase()}`;
    if (existing[0]) return existing[0];
    const [{ maxSort }] = await sql`select coalesce(max(sort_order), 0)::int as "maxSort" from category`;
    const rows = await sql`
      insert into category (name, sort_order) values (${trimmed}, ${maxSort + 1})
      returning id, name, sort_order as "sortOrder"`;
    return rows[0];
  } catch (e) {
    console.error('createCategory failed:', e.message);
    return null;
  }
}

export async function renameCategory(id, name) {
  if (!sql) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  try {
    const rows = await sql`
      update category set name = ${trimmed} where id = ${id}
      returning id, name, sort_order as "sortOrder"`;
    return rows[0] ?? null;
  } catch (e) {
    console.error('renameCategory failed:', e.message);
    return null;
  }
}

/** Every non-archived entry on the given shop, store- then aisle-grouped on the client. */
export async function getList(shopId) {
  if (!sql || !shopId) return [];
  try {
    return await sql`
      select le.id, le.status, le.source, le.added_by as "addedBy",
             le.updated_at as "updatedAt",
             i.id as "itemId", i.name as "itemName", i.is_staple as "isStaple",
             i.category_id as "categoryId",
             s.id as "storeId", s.name as "storeName", s.sort_order as "storeSort"
      from list_entry le
      join shop_item i on i.id = le.item_id
      join store s on s.id = le.store_id
      where le.shop_id = ${shopId} and le.archived_at is null
      order by s.sort_order, i.name`;
  } catch (e) {
    console.error('getList failed:', e.message);
    return [];
  }
}

/**
 * Archived entries, newest first — the restorable bin. Carries the same
 * shape as getList() (plus archivedAt) so a restored row can be spliced
 * straight back into the visible list client-side, the same way a freshly
 * added row is — see components/ShoppingListScreen.jsx.
 */
export async function getBin(limit = 30) {
  if (!sql) return [];
  try {
    return await sql`
      select le.id, le.status, le.source, le.added_by as "addedBy",
             le.updated_at as "updatedAt", le.archived_at as "archivedAt",
             i.id as "itemId", i.name as "itemName", i.is_staple as "isStaple",
             i.category_id as "categoryId",
             s.id as "storeId", s.name as "storeName", s.sort_order as "storeSort"
      from list_entry le
      join shop_item i on i.id = le.item_id
      join store s on s.id = le.store_id
      where le.archived_at is not null
      order by le.archived_at desc
      limit ${limit}`;
  } catch (e) {
    console.error('getBin failed:', e.message);
    return [];
  }
}

/** Case-insensitive match against item.name/aliases. */
export async function findItem(name) {
  if (!sql) return null;
  try {
    const key = norm(name);
    const rows = await sql`
      select id, name, default_store_id as "defaultStoreId", is_staple as "isStaple",
             category_id as "categoryId"
      from shop_item
      where archived_at is null
        and (lower(name) = ${key} or exists (
          select 1 from unnest(aliases) a where lower(a) = ${key}
        ))
      limit 1`;
    return rows[0] ?? null;
  } catch (e) {
    console.error('findItem failed:', e.message);
    return null;
  }
}

export async function createItem(name, storeId, categoryId = null) {
  if (!sql) return null;
  try {
    const rows = await sql`
      insert into shop_item (name, default_store_id, category_id)
      values (${name.trim()}, ${storeId}, ${categoryId})
      returning id, name, default_store_id as "defaultStoreId", is_staple as "isStaple",
                category_id as "categoryId"`;
    return rows[0];
  } catch (e) {
    console.error('createItem failed:', e.message);
    return null;
  }
}

/**
 * Adds an ad-hoc item to the open shop, always under `storeId` — the
 * store/list the caller is adding to right now. A name matching an
 * existing item reuses its canonical identity (aliases, category) but
 * NOT its original store: which store an item lands under is decided by
 * where you add it, every time, never remembered from the first time it
 * was typed.
 *
 * Confirmed with Matt, 28 October 2026: the earlier "remembers its store"
 * behaviour read as broken — adding "Milk" from the Coles list silently
 * landed it on Aldi, with no feedback that a redirect had even happened.
 * `shop_item.default_store_id` still gets set on first creation (a cheap,
 * harmless record of where an item was first seen) but is never read for
 * routing here.
 */
export async function addAdhocItem(name, storeId, addedBy = null, categoryId = null) {
  if (!sql) return { ok: false, error: 'no database' };
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'name required' };
  if (!storeId) return { ok: false, error: 'store required' };

  let item = await findItem(trimmed);
  if (!item) {
    item = await createItem(trimmed, storeId, categoryId);
  }
  const shop = await getOpenShop();
  if (!shop || !item) return { ok: false, error: 'could not add item' };

  try {
    const rows = await sql`
      insert into list_entry (item_id, store_id, source, shop_id, added_by)
      values (${item.id}, ${storeId}, 'adhoc', ${shop.id}, ${addedBy})
      returning id, status, added_by as "addedBy", updated_at as "updatedAt"`;
    const s = (await sql`select name, sort_order as "sortOrder" from store where id = ${storeId}`)[0];
    return {
      ok: true,
      entry: {
        ...rows[0],
        source: 'adhoc',
        itemId: item.id,
        itemName: item.name,
        isStaple: item.isStaple,
        categoryId: item.categoryId,
        storeId,
        storeName: s.name,
        storeSort: s.sortOrder,
      },
    };
  } catch (e) {
    console.error('addAdhocItem failed:', e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * Archives every non-archived entry on the open shop matching `status`
 * (optionally scoped to one store — the phone clears only the tab you're
 * looking at; the iPad, with no tab, clears across every store at once).
 * Returns the full rows so the caller can offer one undo for the whole
 * batch, the same shape as getList() so a restored row slots straight
 * back into the list client-side.
 */
export async function clearChecked(status, storeId = null) {
  if (!sql) return [];
  try {
    const shop = await getOpenShop();
    if (!shop) return [];
    const rows = storeId
      ? await sql`
          select le.id, le.status, le.source, le.added_by as "addedBy", le.updated_at as "updatedAt",
                 i.id as "itemId", i.name as "itemName", i.is_staple as "isStaple", i.category_id as "categoryId",
                 s.id as "storeId", s.name as "storeName", s.sort_order as "storeSort"
          from list_entry le
          join shop_item i on i.id = le.item_id
          join store s on s.id = le.store_id
          where le.shop_id = ${shop.id} and le.status = ${status} and le.archived_at is null and le.store_id = ${storeId}`
      : await sql`
          select le.id, le.status, le.source, le.added_by as "addedBy", le.updated_at as "updatedAt",
                 i.id as "itemId", i.name as "itemName", i.is_staple as "isStaple", i.category_id as "categoryId",
                 s.id as "storeId", s.name as "storeName", s.sort_order as "storeSort"
          from list_entry le
          join shop_item i on i.id = le.item_id
          join store s on s.id = le.store_id
          where le.shop_id = ${shop.id} and le.status = ${status} and le.archived_at is null`;
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    await sql`update list_entry set archived_at = now() where id = any(${ids}::int[])`;
    return rows;
  } catch (e) {
    console.error('clearChecked failed:', e.message);
    return [];
  }
}

export async function setEntryStatus(id, status) {
  if (!sql) return;
  try {
    await sql`update list_entry set status = ${status}, updated_at = now() where id = ${id}`;
  } catch (e) {
    console.error('setEntryStatus failed:', e.message);
  }
}

export async function deleteEntry(id) {
  if (!sql) return;
  try {
    await sql`update list_entry set archived_at = now() where id = ${id}`;
  } catch (e) {
    console.error('deleteEntry failed:', e.message);
  }
}

export async function restoreEntry(id) {
  if (!sql) return;
  try {
    await sql`update list_entry set archived_at = null where id = ${id}`;
  } catch (e) {
    console.error('restoreEntry failed:', e.message);
  }
}

/**
 * Closes the open shop, opens a new one, and returns the previous shop's
 * un-bought entries for the Saturday review (keep/drop) — see the brief's
 * "Weekly shop cycle". Phase 1 has no meals to review, so this is the
 * ad-hoc-only slice of that flow.
 */
export async function startNewShop() {
  if (!sql) return { leftovers: [] };
  try {
    const prev = await getOpenShop();
    if (!prev) return { leftovers: [] };
    await sql`update shop set completed_at = now() where id = ${prev.id}`;
    const created = await sql`insert into shop default values returning id`;

    const leftovers = await sql`
      select le.id, i.name as "itemName", s.name as "storeName"
      from list_entry le
      join shop_item i on i.id = le.item_id
      join store s on s.id = le.store_id
      where le.shop_id = ${prev.id} and le.status != 'bought' and le.archived_at is null`;

    return { leftovers, newShopId: created[0].id };
  } catch (e) {
    console.error('startNewShop failed:', e.message);
    return { leftovers: [] };
  }
}

/** 'keep' carries the entry onto the current open shop; 'drop' archives it. */
export async function resolveLeftover(id, resolution) {
  if (!sql) return;
  try {
    if (resolution === 'keep') {
      const shop = await getOpenShop();
      await sql`
        update list_entry set shop_id = ${shop.id}, status = 'needed', updated_at = now()
        where id = ${id}`;
    } else {
      await sql`update list_entry set archived_at = now() where id = ${id}`;
    }
  } catch (e) {
    console.error('resolveLeftover failed:', e.message);
  }
}
