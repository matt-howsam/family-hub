/* ==========================================================================
   Family Hub — to do & assignments
   See docs/family-hub-todo-brief.md (widens design-brief §7.11).

   `person` is the only write gate — every write here is called from a route
   that has already checked `session.person === person` (or, for `setDone`
   only, `role === 'display'`). This module does not re-check; see
   app/api/todo/route.js.
   ========================================================================== */

import { sql, hasDb } from './db.js';
import { today, TZ, isEveningWindow, mondayOf } from './week.js';
import { TIMETABLE } from './timetable.js';
const DAY = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);

/** Every subject key that child's timetable actually uses, both weeks, deduped. */
export function subjectsFor(personId) {
  const weeks = TIMETABLE[personId];
  if (!weeks) return [];
  const set = new Set();
  for (const days of Object.values(weeks)) {
    for (const periods of Object.values(days)) {
      periods.forEach((s) => set.add(s));
    }
  }
  return [...set].sort();
}

/**
 * Open items for one person, plus anything ticked done since this Monday —
 * a done item stays visible (and un-tickable) through the end of the week
 * rather than vanishing the instant it's ticked, per docs/DECISIONS.md's
 * 16 September 2026 addition. Reuses lib/week.js#mondayOf, the same "week
 * resets clean" boundary chores already use, rather than a rolling
 * N-days-since-ticked window — a shared reset moment is predictable in a
 * way a per-item timer isn't. No separate cleanup job: a done item older
 * than this Monday simply stops being selected on the next read.
 */
export async function listTodos(person) {
  if (!hasDb) return [];
  const weekStart = iso(mondayOf(today(TZ)));
  const rows = await sql`
    select id, person, title, description, due::text as due, subject, type,
           family_visible as "familyVisible", proposed_item_id as "proposedItemId",
           done_at, created_at as "createdAt"
    from todo_item
    where person = ${person} and (done_at is null or done_at >= ${weekStart}::date)
    order by due is null, due asc, title asc`;
  return rows;
}

/** Which person owns an item — every write route checks this against the
    caller's session before touching anything. */
export async function getOwner(id) {
  if (!hasDb) return null;
  const rows = await sql`select person from todo_item where id = ${id}`;
  return rows[0]?.person ?? null;
}

export async function createTodo({ person, title, description, due, subject, type, familyVisible, proposedItemId }) {
  if (!hasDb) throw new Error('no database configured');
  const rows = await sql`
    insert into todo_item (person, title, description, due, subject, type, family_visible, proposed_item_id)
    values (${person}, ${title}, ${description || null}, ${due || null}, ${subject || null},
            ${type}, ${familyVisible ?? true}, ${proposedItemId || null})
    returning id`;
  return rows[0].id;
}

/** Fetches the current row and merges in whatever fields were passed, so
    every write is a single plain UPDATE with concrete values — no nested
    sql`` fragments, a pattern nothing else in this codebase relies on and
    that isn't confirmed to work with @neondatabase/serverless. */
export async function updateTodo(id, fields) {
  if (!hasDb) return;
  const rows = await sql`
    select title, description, due::text as due, subject, type, family_visible as "familyVisible"
    from todo_item where id = ${id}`;
  const current = rows[0];
  if (!current) return;

  const next = { ...current, ...fields };
  await sql`
    update todo_item set
      title = ${next.title},
      description = ${next.description || null},
      due = ${next.due || null},
      subject = ${next.subject || null},
      type = ${next.type},
      family_visible = ${next.familyVisible}
    where id = ${id}`;
}

export async function deleteTodo(id) {
  if (!hasDb) return;
  await sql`delete from todo_item where id = ${id}`;
}

/** The tick. `setFrom` is 'display' | 'phone' — recorded so a mystery state
    change on the fridge is traceable, per the brief's two conditions. */
export async function setDone(id, done, setFrom) {
  if (!hasDb) return;
  if (done) {
    await sql`update todo_item set done_at = now(), set_from = ${setFrom} where id = ${id}`;
  } else {
    await sql`update todo_item set done_at = null, set_from = null where id = ${id}`;
  }
}

/**
 * The one evening line in the kids' block — 17:00-20:30, for an item due
 * tomorrow, never a count. Returns null outside the window, same pattern as
 * lib/mealplanner.js#getTonight so callers don't need to know about it.
 */
export async function eveningLine(person, now = new Date()) {
  if (!hasDb || !isEveningWindow(TZ, now)) return null;

  const tomorrow = iso(new Date(today(TZ, now).getTime() + DAY));
  const rows = await sql`
    select title
    from todo_item
    where person = ${person} and due = ${tomorrow} and done_at is null and family_visible = true
    order by title asc
    limit 1`;
  return rows[0]?.title ?? null;
}
