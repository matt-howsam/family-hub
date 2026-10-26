/* ==========================================================================
   Family Hub — shopping list aisle categories.

   A fixed, small vocabulary rather than free text, so the list sorts into a
   stable, repeatable aisle order instead of whatever a typist happened to
   write. Asked once per item, same moment as its store — see
   lib/shoppinglist.js#createItem. Order here is the aisle-walk order the
   list groups by; new categories need a matching entry in schema.sql's
   check constraint on shop_item.category.
   ========================================================================== */

export const CATEGORIES = [
  { key: 'produce', label: 'Produce' },
  { key: 'bakery', label: 'Bakery' },
  { key: 'deli', label: 'Deli' },
  { key: 'dairy', label: 'Dairy & Eggs' },
  { key: 'meat_seafood', label: 'Meat & Seafood' },
  { key: 'frozen', label: 'Frozen' },
  { key: 'pantry', label: 'Pantry' },
  { key: 'drinks', label: 'Drinks' },
  { key: 'household', label: 'Household' },
  { key: 'other', label: 'Other' },
];

export const CATEGORY_ORDER = CATEGORIES.map((c) => c.key);
export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));
export const DEFAULT_CATEGORY = 'other';

/** Groups a flat list of entries (each needing a `.category`) into aisle
 *  order, dropping empty groups. Uncategorised (`null`) entries land in
 *  Other, same as entries explicitly set to 'other'. */
export function groupByCategory(entries, nameKey = 'itemName') {
  const byKey = entries.reduce((acc, e) => {
    const key = e.category || DEFAULT_CATEGORY;
    (acc[key] ??= []).push(e);
    return acc;
  }, {});
  return CATEGORY_ORDER
    .filter((key) => byKey[key]?.length)
    .map((key) => ({
      key,
      label: CATEGORY_LABEL[key],
      items: byKey[key].sort((a, b) => a[nameKey].localeCompare(b[nameKey])),
    }));
}
