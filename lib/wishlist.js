/* ==========================================================================
   Family Hub — wishlist
   See docs/family-hub-wishlist-brief.md (develops design-brief §7.9,
   replacing the old Wants brief). Phase 1 only: 'personal' scope, ranked by
   the owner, default visibility 'family'.

   `person` is the only write gate for owner actions — every write here is
   called from a route that has already checked `session.person ===
   wish.person`. Covering/uncovering is the opposite: the route checks
   `session.person !== wish.person`. No `role = 'display'` exception
   anywhere in this module, same as Goals — this module does not re-check;
   see app/api/wishlist/route.js.
   ========================================================================== */

import { sql, hasDb } from './db.js';
import { horizonLabel } from './goals.js';
import { today, TZ } from './week.js';

const iso = (d) => d.toISOString().slice(0, 10);
const todayStr = () => iso(today(TZ));

/** `{ person, state }` for a wish — every write route checks `person`
    against the caller's session before touching anything. */
export async function getOwner(id) {
  if (!hasDb) return null;
  const rows = await sql`select person, state from wish where id = ${id}`;
  return rows[0] ?? null;
}

/** Who covered a wish, if anyone — for uncover's coverer-only check and
    for deciding whether `wish_cover` is already taken. */
export async function getCover(wishId) {
  if (!hasDb) return null;
  const rows = await sql`select covered_by as "coveredBy" from wish_cover where wish_id = ${wishId}`;
  return rows[0] ?? null;
}

/**
 * The one function both the person page and the fridge call — the privacy
 * rule lives here, not in the caller. `viewerPerson`/`viewerRole` describe
 * who's asking.
 *
 * - `state = 'listed'` rows are filtered by visibility unless the viewer
 *   is the owner (who sees their own 'me' items too): 'family' always,
 *   'chosen' only via a `supporter` row naming the viewer.
 * - Cover fields are only ever selected when the viewer is neither the
 *   owner nor a `display` session, and only for `state = 'listed'` rows —
 *   once `state = 'got'`, the brief's own "Got it · from Mum" means a
 *   cover stops being secret, so a got row's cover is visible to everyone,
 *   owner included.
 * - A cover's own note is only returned to the coverer themselves.
 * - `my_count`/`my_count_as_at` are only ever selected when the viewer is
 *   the owner — not filtered after the fact, not selected at all in the
 *   other query path.
 */
export async function getWishlistView(ownerPerson, { viewerPerson, viewerRole } = {}) {
  if (!hasDb) return { listed: [], got: [] };
  const isOwner = viewerPerson === ownerPerson;
  const isDisplay = viewerRole === 'display';

  // Three fully separate queries, not one composed with conditional sql``
  // fragments — lib/todo.js's own comment explains why: no nested sql``
  // fragments anywhere in this codebase, unconfirmed to work with
  // @neondatabase/serverless. More to the point here: a query that only
  // *sometimes* joins wish_cover is exactly the kind of thing that leaks a
  // cover to the owner the one time the condition is wrong — a fully
  // separate, cover-free query for the owner's own view makes that
  // structurally impossible rather than conditional.
  let listed;
  if (isOwner) {
    // Never joins wish_cover. The owner sees every visibility tier of
    // their own items, and no cover fields exist in this query at all.
    listed = await sql`
      select id, title, url, note, price, price_as_at as "priceAsAt", position,
             visibility, saving_for as "savingFor", horizon, by::text as by,
             my_count as "myCount", my_count_as_at as "myCountAsAt", deal,
             exists(select 1 from wish_image wi where wi.wish_id = id) as "hasImage"
      from wish
      where person = ${ownerPerson} and scope = 'personal' and state = 'listed'
      order by position asc`;
  } else if (isDisplay) {
    // Also never joins wish_cover — "no route returns cover data to
    // role = 'display'" is as strict as the owner's own rule. No person
    // identity to match 'chosen' against, so family-only.
    listed = await sql`
      select id, title, url, note, price, price_as_at as "priceAsAt", position,
             visibility, saving_for as "savingFor", horizon, by::text as by,
             exists(select 1 from wish_image wi where wi.wish_id = id) as "hasImage"
      from wish
      where person = ${ownerPerson} and scope = 'personal' and state = 'listed' and visibility = 'family'
      order by position asc`;
  } else {
    // The only path that ever joins wish_cover — a sibling, parent, or
    // anyone else who isn't this item's owner.
    listed = await sql`
      select w.id, w.title, w.url, w.note, w.price, w.price_as_at as "priceAsAt",
             w.position, w.visibility, w.saving_for as "savingFor", w.horizon, w.by::text as by,
             exists(select 1 from wish_image wi where wi.wish_id = w.id) as "hasImage",
             wc.covered_by as "coveredBy",
             (wc.covered_by = ${viewerPerson}) as "coveredByMe",
             case when wc.covered_by = ${viewerPerson} then wc.note else null end as "coverNote"
      from wish w
      left join wish_cover wc on wc.wish_id = w.id
      where w.person = ${ownerPerson} and w.scope = 'personal' and w.state = 'listed'
        and (
          w.visibility = 'family'
          or (w.visibility = 'chosen' and exists(
            select 1 from supporter s
            where s.subject_type = 'wish' and s.subject_id = w.id and s.person = ${viewerPerson}
          ))
        )
      order by w.position asc`;
  }

  const got = isOwner
    ? await sql`
        select w.id, w.title, w.price, w.got_at as "gotAt",
               exists(select 1 from wish_image wi where wi.wish_id = w.id) as "hasImage",
               wc.covered_by as "coveredBy", wc.given_at as "givenAt"
        from wish w
        left join wish_cover wc on wc.wish_id = w.id
        where w.person = ${ownerPerson} and w.scope = 'personal' and w.state = 'got'
        order by w.got_at desc`
    : [];

  return {
    listed: listed.map((w) => ({ ...w, horizonLabelText: w.horizon ? horizonLabel(w.horizon, w.by) : null })),
    got,
  };
}

export async function createWish({ person, title, url, note }) {
  if (!hasDb) throw new Error('no database configured');
  const next = await sql`select coalesce(max(position), -1) + 1 as next from wish where person = ${person} and scope = 'personal'`;
  const rows = await sql`
    insert into wish (person, title, url, note, position)
    values (${person}, ${title}, ${url || null}, ${note || null}, ${next[0].next})
    returning id`;
  return rows[0].id;
}

/** Fetches the current row and merges in whatever fields were passed, so
    every write is a single plain UPDATE with concrete values — same
    pattern as lib/todo.js#updateTodo and lib/goals.js#updateGoal. If the
    item is covered, stamps `owner_changed_at` so the coverer sees "Changed
    since you covered it" — a no-op (zero rows touched) when there's no
    cover. */
export async function updateWish(id, fields) {
  if (!hasDb) return;
  const rows = await sql`
    select title, url, note, price, price_as_at::text as "priceAsAt", price_source as "priceSource", visibility
    from wish where id = ${id}`;
  const current = rows[0];
  if (!current) return;
  const next = { ...current, ...fields };
  // A manually-typed price overrides a fetched one, same "anything they've
  // typed wins" rule the fetch itself follows — but only when price is
  // actually part of this write, never silently flipped by an unrelated
  // edit (changing visibility shouldn't relabel an untouched fetched price).
  const priceAsAt = 'price' in fields ? todayStr() : next.priceAsAt;
  const priceSource = 'price' in fields ? 'entered' : next.priceSource;

  await sql`
    update wish set
      title = ${next.title},
      url = ${next.url || null},
      note = ${next.note || null},
      price = ${next.price ?? null},
      price_as_at = ${priceAsAt || null},
      price_source = ${priceSource || null},
      visibility = ${next.visibility},
      updated_at = now()
    where id = ${id}`;
  await sql`update wish_cover set owner_changed_at = now() where wish_id = ${id}`;
}

export async function removeWish(id) {
  if (!hasDb) return;
  await sql`update wish set state = 'removed', updated_at = now() where id = ${id} and state = 'listed'`;
  await sql`update wish_cover set owner_removed_at = now() where wish_id = ${id}`;
}

/** The undo path for removeWish — "undo, never confirm", same rule as
    Goals' release/unrelease and the meal planner before that. */
export async function unremoveWish(id) {
  if (!hasDb) return;
  await sql`update wish set state = 'listed', updated_at = now() where id = ${id} and state = 'removed'`;
  await sql`update wish_cover set owner_removed_at = null where wish_id = ${id}`;
}

/** Swaps `position` with the adjacent listed item for the same person.
    Silently does nothing at either end of the list. No bulk-reorder
    function yet — that's for when drag lands. */
async function swapWithNeighbor(id, direction) {
  const rows = await sql`select person, position from wish where id = ${id} and scope = 'personal' and state = 'listed'`;
  const row = rows[0];
  if (!row) return;
  const neighbor = direction === 'up'
    ? await sql`
        select id, position from wish
        where person = ${row.person} and scope = 'personal' and state = 'listed' and position < ${row.position}
        order by position desc limit 1`
    : await sql`
        select id, position from wish
        where person = ${row.person} and scope = 'personal' and state = 'listed' and position > ${row.position}
        order by position asc limit 1`;
  const other = neighbor[0];
  if (!other) return;
  await sql`update wish set position = ${other.position} where id = ${id}`;
  await sql`update wish set position = ${row.position} where id = ${other.id}`;
}

export const moveUp = (id) => swapWithNeighbor(id, 'up');
export const moveDown = (id) => swapWithNeighbor(id, 'down');

/** Clears any other saving-for-now item for this person first — two
    sequential statements, not one nested query, same reasoning
    lib/todo.js's own comment gives for avoiding nested sql`` fragments. */
export async function setSavingFor(id, { person, horizon, by }) {
  if (!hasDb) return;
  await sql`update wish set saving_for = false, horizon = null, by = null where person = ${person} and saving_for = true`;
  await sql`update wish set saving_for = true, horizon = ${horizon || null}, by = ${horizon === 'date' ? (by || null) : null} where id = ${id}`;
}

export async function unsetSavingFor(id) {
  if (!hasDb) return;
  await sql`update wish set saving_for = false, horizon = null, by = null where id = ${id}`;
}

export async function setMyCount(id, amount) {
  if (!hasDb) return;
  const asAt = amount != null ? todayStr() : null;
  await sql`update wish set my_count = ${amount ?? null}, my_count_as_at = ${asAt} where id = ${id}`;
}

export async function setDeal(id, text) {
  if (!hasDb) return;
  await sql`update wish set deal = ${text || null} where id = ${id}`;
}

export async function markGot(id) {
  if (!hasDb) return;
  await sql`update wish set state = 'got', got_at = current_date, updated_at = now() where id = ${id} and state = 'listed'`;
}

/** The coverer's own "Given" — once given, the cover is no longer secret
    (the owner's Got shelf shows "Got it · from Mum"), so this is just
    markGot plus stamping when. */
export async function markGiven(id, coveredBy) {
  if (!hasDb) return;
  await sql`update wish set state = 'got', got_at = current_date, updated_at = now() where id = ${id} and state = 'listed'`;
  await sql`update wish_cover set given_at = current_date where wish_id = ${id} and covered_by = ${coveredBy}`;
}

/** Plain insert — the primary key on wish_id alone makes a second cover
    attempt a constraint violation, which the route catches and surfaces
    as "already covered." No pre-check needed. */
export async function coverWish(wishId, person, note) {
  if (!hasDb) throw new Error('no database configured');
  await sql`insert into wish_cover (wish_id, covered_by, note) values (${wishId}, ${person}, ${note || null})`;
}

export async function uncoverWish(wishId, coveredBy) {
  if (!hasDb) return;
  await sql`delete from wish_cover where wish_id = ${wishId} and covered_by = ${coveredBy}`;
}

/** The image itself — served by app/api/wishlist/image/[wishId]/route.js. */
export async function getWishImage(wishId) {
  if (!hasDb) return null;
  const rows = await sql`select content_type as "contentType", data from wish_image where wish_id = ${wishId}`;
  return rows[0] ?? null;
}

export async function setWishImage({ wishId, buffer, contentType, source }) {
  if (!hasDb) return;
  await sql`
    insert into wish_image (wish_id, content_type, data, source)
    values (${wishId}, ${contentType}, ${buffer}, ${source})
    on conflict (wish_id) do update set content_type = excluded.content_type, data = excluded.data, source = excluded.source, created_at = now()`;
}

/** Pre-fill, never overwrite — fetched title/price fill empty fields only;
    anything the person already typed wins. Called right after createWish
    with the fetch result, before the person has had a chance to type
    anything else, so "empty" here just means "the add form's own fields". */
export async function applyFetchedMetadata(id, { title, price }) {
  if (!hasDb) return;
  const rows = await sql`select title, price from wish where id = ${id}`;
  const current = rows[0];
  if (!current) return;
  if (price != null && current.price == null) {
    await sql`update wish set price = ${price}, price_as_at = current_date, price_source = 'fetched' where id = ${id}`;
  }
  if (title && (!current.title || current.title.trim() === '')) {
    await sql`update wish set title = ${title} where id = ${id}`;
  }
}
