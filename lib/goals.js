/* ==========================================================================
   Family Hub — goals
   See docs/family-hub-goals-brief.md (develops design-brief §7.5).

   `person` is the only write gate — every write here is called from a route
   that has already checked `session.person === person`. Unlike todo_item,
   there is no `role = 'display'` exception anywhere in this module: "Matt
   cannot write Rose's goals," full stop, per the brief. This module does
   not re-check; see app/api/goals/route.js.

   v1 ships `visibility = 'me'` only — the 'chosen'/'family' values exist in
   the schema but nothing here reads or writes them yet.
   ========================================================================== */

import { sql, hasDb } from './db.js';
import { today, TZ } from './week.js';
import { TERMS } from './calendar.js';

const iso = (d) => d.toISOString().slice(0, 10);
const MAX_ACTIVE = 3;

/** The term containing `when`, or — between terms — the next one. Never
    reuses lib/week.js#termOf/termOfWeek: both return null over a holiday,
    and the brief requires "between terms, this term means the next term."
    TERMS is already chronological, so the first match is the right one. */
export function currentOrNextTerm(when = today(TZ)) {
  const d = iso(when);
  return TERMS.find((t) => t.end >= d) ?? null;
}

/** Term 4 of the same school year as `term` — the brief's "this year". */
function term4Of(term) {
  if (!term) return null;
  return TERMS.find((t) => t.year === term.year && t.term === 4) ?? null;
}

/** Display label for a horizon chip. 'term'/'year' are always re-derived
    live from TERMS, never from the stored `by` column — the brief's "a
    term-date correction can re-resolve it" is true because there is
    nothing stale to correct. 'date' is the only horizon where `by` is
    stored and authoritative. */
export function horizonLabel(horizon, by) {
  if (horizon === 'term') {
    const t = currentOrNextTerm();
    return t ? `by end of ${t.name} (Term ${t.term})` : 'by end of term';
  }
  if (horizon === 'year') {
    const t4 = term4Of(currentOrNextTerm());
    return t4 ? `by end of ${t4.year}` : 'this year';
  }
  if (horizon === 'date' && by) {
    return `by ${new Date(`${by}T00:00:00Z`).toLocaleDateString('en-AU', {
      timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric',
    })}`;
  }
  return 'later';
}

/** `{ person, kind, state, aimId }` for a goal or aim — every write route
    checks `person` against the caller's session before touching anything,
    and some actions (setAim, makeAim) need `kind`/`state` too. */
export async function getMeta(id) {
  if (!hasDb) return null;
  const rows = await sql`select person, kind, state, aim_id as "aimId" from goal where id = ${id}`;
  return rows[0] ?? null;
}

/** One person's full goal set, grouped for "My goals". A household's goal
    count is small enough that grouping in JS from one query beats five
    round trips. */
export async function getGoalsView(person) {
  if (!hasDb) return { active: [], aims: [], someday: [], done: [], released: [] };

  const rows = await sql`
    select id, person, kind, aim_id as "aimId", title, done_when as "doneWhen",
           hoping_for as "hopingFor", why, obstacle, if_then as "ifThen",
           next_step as "nextStep", help_wanted as "helpWanted",
           horizon, by::text as by, state, visibility, reflection,
           release_note as "releaseNote", win_shared_at as "winSharedAt",
           todo_item_id as "todoItemId", want_id as "wantId", position,
           created_at as "createdAt", updated_at as "updatedAt",
           done_at as "doneAt", released_at as "releasedAt"
    from goal where person = ${person} order by created_at asc`;
  const stonesOf = (aimId) => rows.filter((g) => g.kind === 'goal' && g.aimId === aimId);

  const active = rows.filter((g) => g.kind === 'goal' && g.state === 'active' && !g.aimId);
  const aims = rows
    .filter((g) => g.kind === 'aim' && g.state === 'active')
    .map((aim) => ({ ...aim, stones: stonesOf(aim.id).filter((s) => s.state === 'active') }));
  const someday = rows.filter((g) => g.kind === 'goal' && g.state === 'someday');
  const done = rows.filter((g) => g.state === 'done').sort((a, b) => new Date(b.doneAt) - new Date(a.doneAt));
  const released = rows
    .filter((g) => g.state === 'released')
    .sort((a, b) => new Date(b.releasedAt) - new Date(a.releasedAt));

  return { active, aims, someday, done, released };
}

/** Just the titles needed for the "move one to Someday to make room"
    chooser when a create/promote hits the 3-active cap. */
export async function listActive(person) {
  if (!hasDb) return [];
  return sql`
    select id, title from goal
    where person = ${person} and kind = 'goal' and state = 'active'
    order by created_at asc`;
}

/** Existing active aims for a person, for the "Part of…" picker. */
export async function listAims(person) {
  if (!hasDb) return [];
  return sql`
    select id, title from goal
    where person = ${person} and kind = 'aim' and state = 'active'
    order by created_at asc`;
}

export async function countActive(person) {
  if (!hasDb) return 0;
  const rows = await sql`
    select count(*)::int as n from goal
    where person = ${person} and kind = 'goal' and state = 'active'`;
  return rows[0].n;
}

/** One goal or aim, plus — for an aim — its full stepping-stone path
    (every state, for the path view); or, for a stepping stone, its
    parent aim's title. */
export async function getGoalDetail(id) {
  if (!hasDb) return null;
  const rows = await sql`
    select id, person, kind, aim_id as "aimId", title, done_when as "doneWhen",
           hoping_for as "hopingFor", why, obstacle, if_then as "ifThen",
           next_step as "nextStep", help_wanted as "helpWanted",
           horizon, by::text as by, state, visibility, reflection,
           release_note as "releaseNote", win_shared_at as "winSharedAt",
           todo_item_id as "todoItemId", want_id as "wantId", position,
           created_at as "createdAt", updated_at as "updatedAt",
           done_at as "doneAt", released_at as "releasedAt"
    from goal where id = ${id}`;
  const goal = rows[0];
  if (!goal) return null;
  // Computed server-side so the client component never needs to import
  // this module (it pulls in lib/db.js, server-only) just to show a label.
  goal.horizonLabelText = goal.horizon ? horizonLabel(goal.horizon, goal.by) : null;

  let aim = null;
  let stones = [];
  if (goal.aimId) {
    const r = await sql`select id, title from goal where id = ${goal.aimId}`;
    aim = r[0] ?? null;
  }
  if (goal.kind === 'aim') {
    stones = await sql`
      select id, title, next_step as "nextStep", state, done_at as "doneAt"
      from goal where aim_id = ${id}
      order by position asc nulls last, created_at asc`;
  }
  return { goal, aim, stones };
}

export async function createGoal({ person, kind, title, doneWhen, nextStep, horizon, by, aimId }) {
  if (!hasDb) throw new Error('no database configured');
  const resolvedBy = kind === 'goal' && horizon === 'date' ? (by || null) : null;

  let position = null;
  if (aimId) {
    const r = await sql`select coalesce(max(position), -1) + 1 as next from goal where aim_id = ${aimId}`;
    position = r[0].next;
  }

  const rows = await sql`
    insert into goal (person, kind, aim_id, title, done_when, next_step, horizon, by, position)
    values (
      ${person}, ${kind}, ${aimId || null}, ${title},
      ${kind === 'goal' ? (doneWhen || null) : null},
      ${nextStep || null},
      ${kind === 'goal' ? (horizon || null) : null},
      ${resolvedBy},
      ${position}
    )
    returning id`;
  return rows[0].id;
}

/** Fetches the current row and merges in whatever fields were passed, so
    every write is a single plain UPDATE with concrete values — same
    pattern as lib/todo.js#updateTodo, for the same reason. */
export async function updateGoal(id, fields) {
  if (!hasDb) return;
  const rows = await sql`
    select title, done_when as "doneWhen", hoping_for as "hopingFor", why, obstacle,
           if_then as "ifThen", next_step as "nextStep", help_wanted as "helpWanted",
           horizon, by::text as by
    from goal where id = ${id}`;
  const current = rows[0];
  if (!current) return;

  const next = { ...current, ...fields };
  const by = next.horizon === 'date' ? (next.by || null) : null;

  await sql`
    update goal set
      title = ${next.title},
      done_when = ${next.doneWhen || null},
      hoping_for = ${next.hopingFor || null},
      why = ${next.why || null},
      obstacle = ${next.obstacle || null},
      if_then = ${next.ifThen || null},
      next_step = ${next.nextStep || null},
      help_wanted = ${next.helpWanted || null},
      horizon = ${next.horizon || null},
      by = ${by},
      updated_at = now()
    where id = ${id}`;
}

/** Someday → active. Caller (the route) checks countActive() against the
    3-active cap first — this just moves it, silently a no-op if it isn't
    currently in Someday. */
export async function promote(id) {
  if (!hasDb) return;
  await sql`update goal set state = 'active', updated_at = now() where id = ${id} and state = 'someday'`;
}

/** Active → someday. Also the "move one to make room" half of the
    does-not-refuse cap flow. */
export async function demote(id) {
  if (!hasDb) return;
  await sql`update goal set state = 'someday', updated_at = now() where id = ${id} and state = 'active'`;
}

export async function completeGoal(id, reflection) {
  if (!hasDb) return;
  await sql`
    update goal set state = 'done', done_at = now(), reflection = ${reflection || null}, updated_at = now()
    where id = ${id} and state in ('active', 'someday')`;
}

/** Returns the state it left (so `unrelease` can restore it exactly) or
    null if it wasn't in a releasable state — "undo, never confirm", same
    rule as the meal planner. */
export async function release(id, note) {
  if (!hasDb) return null;
  const rows = await sql`select state from goal where id = ${id} and state in ('active', 'someday')`;
  const from = rows[0]?.state;
  if (!from) return null;
  await sql`
    update goal set state = 'released', released_at = now(), release_note = ${note || null}, updated_at = now()
    where id = ${id}`;
  return from;
}

/** The undo path for `release`. */
export async function unrelease(id, toState) {
  if (!hasDb) return;
  await sql`
    update goal set state = ${toState}, released_at = null, release_note = null, updated_at = now()
    where id = ${id} and state = 'released'`;
}

/** goal → aim. A no-op (not an error) if it's already a stepping stone —
    v1 doesn't support promoting a stone to its own aim. */
export async function makeAim(id) {
  if (!hasDb) return;
  await sql`
    update goal set kind = 'aim', done_when = null, horizon = null, by = null, updated_at = now()
    where id = ${id} and kind = 'goal' and aim_id is null`;
}

/** "Part of…" — link to an existing aim, or create one from a title and
    link to that. Returns the aim's id either way, or null if neither an
    aimId nor a title was given. */
export async function setAimLink(goalId, { person, aimId, newAimTitle }) {
  if (!hasDb) return null;
  let targetAimId = aimId || null;
  if (!targetAimId && newAimTitle) {
    const rows = await sql`
      insert into goal (person, kind, title, state) values (${person}, 'aim', ${newAimTitle}, 'active')
      returning id`;
    targetAimId = rows[0].id;
  }
  if (!targetAimId) return null;

  const posRows = await sql`select coalesce(max(position), -1) + 1 as next from goal where aim_id = ${targetAimId}`;
  await sql`
    update goal set aim_id = ${targetAimId}, position = ${posRows[0].next}, updated_at = now()
    where id = ${goalId}`;
  return targetAimId;
}

export { MAX_ACTIVE };
