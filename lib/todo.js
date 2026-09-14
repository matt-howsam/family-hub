/* ==========================================================================
   Family Hub — to do & assignments
   See docs/family-hub-todo-brief.md (widens design-brief §7.11).

   `person` is the only write gate — every write here is called from a route
   that has already checked `session.person === person` (or, for `setDone`
   only, `role === 'display'`). This module does not re-check; see
   app/api/todo/route.js.
   ========================================================================== */

import { sql, hasDb } from './db.js';
import { today, TZ, isEveningWindow } from './week.js';
import { TIMETABLE } from './timetable.js';

const DAY = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);

/* "This week" boundary, per person-stated framing: assessments need a week
   to ten days of lead time; a plain task doesn't carry the same stakes. */
const LEAD_WINDOW_DAYS = { assignment: 7, test: 7, exam: 7, assessment: 7, task: 2 };

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

/** Open items for one person, nearest due date first, undated last. */
export async function listTodos(person) {
  if (!hasDb) return [];
  const rows = await sql`
    select id, person, title, description, due::text as due, subject, type,
           family_visible as "familyVisible", proposed_item_id as "proposedItemId",
           created_at as "createdAt"
    from todo_item
    where person = ${person} and done_at is null
    order by due is null, due asc, title asc`;
  return rows;
}

/**
 * Group by proximity, per the brief: "This week" at the type's lead window
 * (7 days, or 2 for a plain task), everything further out is "Later",
 * undated items sit in their own group at the foot. The brief also names a
 * "Next week" tier without giving it a boundary, and its own worked example
 * (an item due in 10 days sits in "Later") only holds if there's no such
 * middle band between a 7-day window and "Later" — so this implements two
 * real groups, not three, until that's pinned down. Flagged to Matt.
 */
export function groupTodos(items, now = today(TZ)) {
  const thisWeek = [];
  const later = [];
  const undated = [];

  for (const item of items) {
    if (!item.due) {
      undated.push(item);
      continue;
    }
    const dueDate = new Date(`${item.due}T00:00:00Z`);
    const daysOut = Math.round((dueDate.getTime() - now.getTime()) / DAY);
    const window = LEAD_WINDOW_DAYS[item.type] ?? 7;
    (daysOut <= window ? thisWeek : later).push(item);
  }

  return { thisWeek, later, undated };
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
