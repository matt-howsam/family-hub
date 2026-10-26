/* ==========================================================================
   Family Hub — shopping list aisle grouping.

   Categories themselves live in the `category` table (lib/shoppinglist.js —
   getCategories/createCategory/renameCategory), editable from Settings.
   This file is just the pure, client-safe grouping helper: given a flat
   list of entries and the ordered category list those entries' categoryId
   should map against, sort into aisle-walk order.
   ========================================================================== */

/**
 * Groups entries by categoryId into the order `categories` is already
 * sorted in (by sort_order). An entry with no matching category — null,
 * or one that's since been deleted — lands in a trailing "Uncategorised"
 * group rather than being dropped.
 */
export function groupByCategory(entries, categories, nameKey = 'itemName') {
  const byId = entries.reduce((acc, e) => {
    const key = categories.some((c) => c.id === e.categoryId) ? e.categoryId : 'none';
    (acc[key] ??= []).push(e);
    return acc;
  }, {});

  const groups = categories
    .filter((c) => byId[c.id]?.length)
    .map((c) => ({
      key: c.id,
      label: c.name,
      items: [...byId[c.id]].sort((a, b) => a[nameKey].localeCompare(b[nameKey])),
    }));

  if (byId.none?.length) {
    groups.push({
      key: 'none',
      label: 'Uncategorised',
      items: [...byId.none].sort((a, b) => a[nameKey].localeCompare(b[nameKey])),
    });
  }

  return groups;
}
