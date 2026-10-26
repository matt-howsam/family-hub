# Family Hub — Meals, Recipes & Shopping brief

Oct 26, 2026 · @Matt

## Context and goal

Merge the Meal Planner and a new shopping list into one module, bridged by recipe records. The Meal Planner is well used, and Renée has asked for a shopping list.

- Each planned meal links to a recipe (ingredients plus method).
- Ingredients resolve to canonical items, and each item remembers which store it comes from (Coles, Aldi, butcher or custom).
- Planning a meal derives a shopping list split by store. Pantry items are ticked off as not needed.
- Ad-hoc items ("we're out of milk") go on the same list.
- The list is edited on the bench iPad and used on a phone in store.

## Device model

The bench iPad is the primary editing surface for this module, and the phone is for shopping. This is the same physical iPad as "the fridge" everywhere else in the docs — same `role=display` pairing, same device — moved from the fridge door to the kitchen bench, where it sits open like a recipe book rather than mounted on the wall. See `docs/DECISIONS.md` ("The fridge iPad moves to the bench") and `docs/identity.md` ("Roles and capabilities", "The fridge").

That relocation also widens what this device may write, but only for family-register modules: this one included. Household-register modules (Spending Scorecard, Operations Register) stay adult-only and read-only on this device, same as before. Every other module's existing fridge behaviour (chores' one exception, the dashboard's read-only wall, the register's adult gate) is unchanged — this brief doesn't touch them.

| Task | Bench iPad | Phone |
| --- | --- | --- |
| Plan or change the week's meals | Primary | Supported |
| Add, edit or import a recipe (URL, photo, manual) | Primary | Supported |
| Pick a meal icon | Primary | Supported |
| Tick pantry items, add ad-hoc items | Primary | Supported |
| Cook from a recipe (method view, screen kept awake) | Primary | Not needed |
| Shop: view list by store, tick items in the aisle | Not needed | Primary, works offline |

**Rules for shared editing**

- No per-person login on the iPad. It runs as a household session; magic links remain for phones.
- Record who changed what with a light "who's this?" avatar tap or the last-used person. Attribution, not access control.
- Deletes are soft, with an undo toast and a restorable bin, because mis-taps on a shared device are the real risk.
- Household-register modules (Spending Scorecard, Operations Register) stay adult-only. Only family-register modules open up to iPad editing.
- External content (recipe imports from URLs and photos) still goes through a review step before it is saved.

## Data model

Store belongs to the canonical item, not the recipe line. Recipes describe the same thing many ways ("2 garlic cloves, crushed", "1 tsp minced garlic"), so the item table stops store assignment from becoming a chore.

| Table | Key fields | Notes |
| --- | --- | --- |
| `store` | id, name, sort\_order | Seeded with Coles, Aldi, Butcher. Custom stores can be added. |
| `item` | id, name, aliases\[\], default\_store\_id, is\_staple | The canonical thing you buy. `is_staple` = usually in the pantry. |
| `recipe` | id, title, source\_url, source\_type (url, photo, manual), method, servings, icon, image\_url, thumb\_url, notes | Reusable library. Keep the source URL for attribution. Image is optional; the meal icon stands in when there is none. |
| `recipe_ingredient` | id, recipe\_id, raw\_text, qty, unit, item\_id, sort\_order | `raw_text` is always kept; `item_id` is resolved on save. |
| `meal` | existing table + recipe\_id (nullable), status (planned, cooked, skipped) | A meal can exist without a recipe, e.g. "takeaway". |
| `list_entry` | id, item\_id, store\_id, source (meal, adhoc), meal\_id, status (needed, have, bought), added\_by, updated\_at | One row per item per meal, grouped on display. `store_id` can override for this shop. |

**Item resolution**

1. On recipe save, match each ingredient's parsed name against `item.name` and `aliases`.
2. If there's no match, ask once: "New item: garlic. Which store?" Create the item with that default store.
3. Ad-hoc adds use the same match, with autocomplete from `item`.
4. Over a few weeks most items resolve automatically.

## Flows

The weekly loop runs in this order: plan, derive, tick, add, delete, shop, review.

1. **Plan.** On the iPad, add a meal to a day by picking from the recipe library (photo cards) or typing a name. Change the icon in place.
2. **Derive.** Adding a meal with a recipe creates `list_entry` rows for its ingredients, each with its item's default store. Removing the meal removes its rows unless they've been ticked.
3. **Pantry tick.** The list view on the iPad shows items grouped by store. Staples start as "have" and sit at the bottom; tap to flip to "needed". Other items start as "needed"; tap if already in the pantry.
4. **Ad-hoc add.** One text field, always visible on the list view, with item autocomplete and the store pre-filled. One tap to add.
5. **Delete.** Every `list_entry`, meal-derived or ad-hoc, can be removed directly from the list view — swipe or a per-row delete affordance, one tap, with the same undo toast as everywhere else. This is separate from the pantry tick (which marks "have", not gone) and from the Saturday review's keep/drop (which is about carry-over, not a mis-add). A list that only grows until Saturday doesn't stay clean; deleting a wrong or no-longer-needed item is an everyday action, not a weekly one.
6. **Shop.** On the phone, pick a store tab and tick items as bought. Each item shows the meals that need it ("Onion: Tue stir-fry, Thu bolognese").
7. **Review.** When a shop is marked done and the next one is started (usually Saturday morning), the shop review runs. The list never expires on a timer. See Weekly shop cycle.
8. **Cook.** On the iPad, open the meal to show its photo, then its method in large type with the ingredient list. Keep the screen awake while open.

Quantities are not merged in v1. Entries are grouped by item with their source meals listed.

## Weekly shop cycle

The list is continuous and runs from shop to shop, not by calendar week. Each Saturday morning starts with a short review of the last shop, then planning, then the new list.

1. **Start new shop** (button on the iPad list panel). This opens the review of what's left from the previous shop.
2. **Review leftovers.** Unbought items are grouped by the meal they were for. Keep or drop each one, or keep or drop a whole meal's group. Ad-hoc leftovers default to keep.
3. **Review last week's meals.** Planned meals not marked cooked are offered as "move to this week" or "drop". A moved meal brings its bought ingredients as "have" and its unbought ones as "needed". A dropped meal takes its unbought items with it.
4. **Plan the week.** Add meals as usual. Each one adds its items to the list.
5. **Pantry tick and ad-hoc adds**, then go shopping from the phone.
6. **Mid-week top-ups** go onto the same open list. There's no need to start a new shop for one item.

Meals changed on the fly are handled in step 3. If a meal was swapped mid-week because something wasn't available, mark the original skipped and add the replacement, and the review cleans up its leftovers next Saturday.

Data: add a `shop` record (id, started\_at, completed\_at) and a `shop_id` on `list_entry`, so the review knows what belonged to the last run.

## Where the list lives

On the iPad, the list belongs with the meal planner. On the phone, it belongs wherever is fastest to reach in the shop.

| Surface | Entry point | Behaviour |
| --- | --- | --- |
| iPad | List button in the meal planner header, with a count badge ("List · 14") | Opens a panel over the lower half of the week view, so meals and list are visible together while planning. Holds Start new shop, pantry ticks and the ad-hoc field. |
| Phone (now) | Under More, plus a direct `/list` route | Opens straight to store tabs. The route can be saved to the home screen for one-tap access in the car park. |
| Phone (redesign) | Its own bottom tab | Shopping is the phone's main job for this module, so it should not sit in More. |

## Recipe import

There are three import paths, and every import lands in a review screen before saving. That screen shows parsed ingredients with item matches and the method, all editable.

| Path | How | Effort |
| --- | --- | --- |
| URL | Server route fetches the page and reads the schema.org `Recipe` JSON-LD (`recipeIngredient`, `recipeInstructions`, `recipeYield`, `name`). taste.com.au and most recipe sites publish it. No LLM needed. If no JSON-LD is found, fall back to manual. | Low |
| Photo | iPad or phone camera (a recipe book on the bench is right next to the iPad). The image goes to the Claude API with a vision prompt that returns structured JSON (title, ingredients\[\], method\[\]). Handles handwriting. | Medium (phase 3) |
| Manual | Paste or type ingredients one per line plus the method. The same line parser splits qty, unit and name. | Low |

The line parser handles common forms ("2 cups flour", "1/2 tsp salt", "3 garlic cloves, crushed", "salt and pepper to taste") and always keeps `raw_text`, so a bad parse is never destructive.

**Recipe image**

Every recipe can carry one photo of the finished dish, so you can see what you're aiming for.

- **From a URL:** take the JSON-LD `image` field (it can be a string, an array or an ImageObject), falling back to the page's `og:image`. Show it on the review screen with a "use this" or "replace" choice.
- **Added manually:** take a photo with the iPad or phone camera, or pick one from the library. Available on any recipe, including after cooking it yourself.
- **Photo-imported recipes:** if the book page has a dish photo, offer a crop of it as the recipe image.
- **Storage:** download and keep a copy in Vercel Blob rather than hotlinking. Source sites change URLs, and a local copy can be cached for offline use. Store a resized main image (about 1200 px) and a thumbnail (about 300 px) for meal cards. This is a deliberate exception to the app's usual `bytea`-in-Postgres file storage — recorded in `docs/DECISIONS.md` ("Recipe images are stored in Vercel Blob").
- **No image:** fall back to the meal icon on a tinted card.

## Offline and sync

The phone list must work with no signal, because supermarket interiors are often dead zones.

- The service worker caches the shopping list route and its data. The latest list is stored in IndexedDB on every load.
- Ticks made offline are queued locally and replayed on reconnect. Each `list_entry` change carries `updated_at`, and the latest change wins per row.
- When two people shop different stores at once, ticks sync between phones within a few seconds of being online. Polling every 10 to 15 seconds while the list view is open is enough; no realtime infrastructure is needed.
- A small indicator shows offline state and the count of unsynced ticks.

## Phasing

Phase 1 answers Renée's request on its own. Each later phase builds on real use of the one before.

| Phase | Scope | Done when |
| --- | --- | --- |
| 1. Shopping list | `store`, `item`, `list_entry` (ad-hoc only). iPad list view by store with ad-hoc add. Phone shop view with offline ticks and sync. Carry-over. Soft delete and undo. | Renée does a real shop from her phone. |
| 2. Recipes | `recipe`, `recipe_ingredient`, meal → recipe link. URL import and manual entry with review screen. Item resolution. Derived list entries. Staples. Cook view. iPad meal and icon editing. | A planned week produces a correct per-store list. |
| 3. Photo import | Vision extraction through the Claude API into the same review screen. | A recipe book page and a handwritten card both import cleanly. |

**Out of scope for now**

- Quantity merging across recipes
- Serving scaling
- Aisle ordering within a store
- Prices or online ordering
- Voice add ("Hey Siri, add milk"). The item table is designed to make this easy later, for the native HomeView direction.

## Acceptance criteria

- [ ] An ad-hoc item can be added on the iPad in under 5 seconds, with its store pre-filled after first use.
- [ ] Any item on the list, meal-derived or ad-hoc, can be deleted directly from the list view in one tap, with undo — without waiting for the Saturday review.
- [ ] The phone list loads and accepts ticks in airplane mode, then syncs on reconnect without losing or duplicating ticks.
- [ ] Two phones ticking different stores see each other's changes within 15 seconds.
- [ ] A taste.com.au URL imports title, image, ingredients and method with no manual fixes for a typical recipe.
- [ ] Adding a meal with a recipe adds its items under the correct stores. Removing the meal removes unticked items only.
- [ ] Staples default to "have" and never clutter the needed list unless flipped.
- [ ] Any delete on the iPad can be undone from a toast, and recovered from the bin afterwards.
- [ ] Touch targets on the iPad are at least 44 pt, and design tokens keep WCAG AA contrast in both registers.
- [ ] The cook view shows the recipe photo and keeps the screen awake while open.
