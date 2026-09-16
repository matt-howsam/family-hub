/* ==========================================================================
   Pure grouping logic for the to-do list — no DB import, so it's safe to
   use from components/TodoSection.jsx (a client component) as well as
   lib/todo.js's server-side page render. Splitting this out of lib/todo.js
   is what lets the client re-group after an optimistic toggle without a
   full page reload: the exact same function server and client use, so
   there's no second implementation to drift out of sync.
   ========================================================================== */

const DAY = 86400000;

/* "This week" boundary, per person-stated framing: assessments need a week
   to ten days of lead time; a plain task doesn't carry the same stakes. */
const LEAD_WINDOW_DAYS = { assignment: 7, test: 7, exam: 7, assessment: 7, task: 2 };

/**
 * Group by proximity, per docs/family-hub-todo-brief.md: "This week" at the
 * type's lead window (7 days, or 2 for a plain task), "Later" beyond that,
 * undated items in their own group. Done items get a fourth group instead
 * of dropping out of the list entirely — see docs/DECISIONS.md's "done
 * items stay visible until the next Monday" addition, 16 September 2026.
 */
export function groupTodos(items, now) {
  const thisWeek = [];
  const later = [];
  const undated = [];
  const done = [];

  for (const item of items) {
    if (item.done_at) {
      done.push(item);
      continue;
    }
    if (!item.due) {
      undated.push(item);
      continue;
    }
    const dueDate = new Date(`${item.due}T00:00:00Z`);
    const daysOut = Math.round((dueDate.getTime() - now.getTime()) / DAY);
    const window = LEAD_WINDOW_DAYS[item.type] ?? 7;
    (daysOut <= window ? thisWeek : later).push(item);
  }

  // Most recently ticked first — the satisfying-tick moment should stay at
  // the top of the done list, not get buried under older completions.
  done.sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''));

  return { thisWeek, later, undated, done };
}
