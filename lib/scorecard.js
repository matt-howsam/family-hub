/* ==========================================================================
   Family Hub — spending scorecard
   Digitises the Howsam Discretionary Spending Scorecard. See
   docs/family-hub-spending-scorecard-brief.md. Numbers only, never
   transactions — categorisation happens outside the app.

   Reads degrade the same way lib/mealplanner.js does: no database, or a
   query a not-yet-migrated database rejects, means an empty view, never a
   thrown error.
   ========================================================================== */

import { sql, hasDb } from './db.js';
import { today, TZ, daysInMonth, spendWeeksOf, proRataTarget, paceOf, daysElapsedIn } from './week.js';

const emptyView = { notOpen: false, noData: false, categories: [], weekMeta: [], weekTotals: [], currentWeekNo: null,
  budgetTotal: 0, monthTotal: 0, monthComplete: false, comparison: null,
  isCurrentMonth: false, daysElapsed: 0, daysInMonth: 0,
  mtdTotal: 0, mtdTargetTotal: 0, currentWeekTargetTotal: 0, pace: null };

function cmpYm(y1, m1, y2, m2) {
  return y1 !== y2 ? y1 - y2 : m1 - m2;
}

function prevMonth(year, month) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/** Whole-dollar display, no cents, no currency symbol beyond the leading $
    — the card's own convention. `cents` may be null (unentered). */
export function formatDollars(cents) {
  if (cents == null) return null;
  return `$${Math.round(cents / 100).toLocaleString('en-AU')}`;
}

/**
 * The month's period row, if one exists. Auto-creates it (with its four
 * spend_week rows, and its budget carried forward from the most recent
 * prior period) only for the live current month, the first time it's read
 * — there is no cron in this app (Hobby-plan cron is capped at once/day;
 * see DECISIONS.md's conditions-cache note for the same constraint
 * elsewhere), so "frozen when the month opens" means frozen the first time
 * anyone opens it, which for a fridge that's on all day is close enough to
 * the real boundary. A past month with no row is just a month nobody
 * entered — returns null rather than writing a fabricated historical
 * period, since a stray query string (or a bug) must never be able to
 * conjure real-looking rows for a month the household never lived through.
 */
async function ensurePeriod(year, month) {
  const now = today(TZ);
  const isCurrent = year === now.getUTCFullYear() && month === now.getUTCMonth() + 1;

  const existing = await sql`select id, locked_at from spend_period where year = ${year} and month = ${month}`;
  if (existing[0]) return existing[0];
  if (!isCurrent) return null;

  const [{ id }] = await sql`
    insert into spend_period (year, month, locked_at) values (${year}, ${month}, now())
    on conflict (year, month) do update set year = excluded.year
    returning id`;

  const weeks = spendWeeksOf(year, month);
  for (const w of weeks) {
    await sql`
      insert into spend_week (period_id, week_no, starts_on, ends_on)
      values (${id}, ${w.weekNo}, ${w.startsOn}::date, ${w.endsOn}::date)
      on conflict (period_id, week_no) do nothing`;
  }

  // Carry forward the most recent earlier period's base budget, category by
  // category, so a newly-opened month isn't all zeroes. Per the brief:
  // "Base budget per category, edited rarely" — this is the "rarely changes"
  // default, not a decision this function is allowed to make otherwise.
  const prior = await sql`
    select category_key, base_amount from spend_budget
    where period_id = (
      select id from spend_period
      where (year < ${year}) or (year = ${year} and month < ${month})
      order by year desc, month desc limit 1
    )`;
  // Any budget_event rows already entered for this year/month — added ahead
  // of time, before the month existed as a period — fold straight into the
  // opening budget rather than sitting inert. An event added AFTER this
  // point (once the period row below exists) goes through addBudgetEvent's
  // own update instead, and is an amendment.
  const events = await sql`
    select category_key, coalesce(sum(amount), 0)::int as total
    from budget_event where year = ${year} and month = ${month}
    group by category_key`;
  const eventByCat = Object.fromEntries(events.map((e) => [e.category_key, e.total]));

  for (const row of prior) {
    await sql`
      insert into spend_budget (period_id, category_key, base_amount, event_amount)
      values (${id}, ${row.category_key}, ${row.base_amount}, ${eventByCat[row.category_key] ?? 0})
      on conflict (period_id, category_key) do nothing`;
  }

  return { id, locked_at: new Date().toISOString() };
}

/**
 * Full month view: eleven category rows with four weeks, month totals and
 * variance, plus the headline month-on-month comparison line. Returns
 * `{ notOpen: true }` for a month that hasn't started yet (the caller
 * should not offer navigation past the current month) or `{ noData: true }`
 * for a past month nobody ever entered.
 */
export async function getMonthView(year, month) {
  if (!hasDb) return emptyView;
  try {
    const now0 = today(TZ);
    const isFuture = cmpYm(year, month, now0.getUTCFullYear(), now0.getUTCMonth() + 1) > 0;

    const period = await ensurePeriod(year, month);
    if (!period) return { ...emptyView, year, month, notOpen: isFuture, noData: !isFuture };

    const [categories, budgets, weeks, entries] = await Promise.all([
      sql`select key, label, description, position from spend_category
          where archived_at is null order by position`,
      sql`select category_key, base_amount, event_amount from spend_budget where period_id = ${period.id}`,
      sql`select week_no, starts_on::text as "startsOn", ends_on::text as "endsOn"
          from spend_week where period_id = ${period.id} order by week_no`,
      sql`select week_no, category_key, amount from spend_entry where period_id = ${period.id}`,
    ]);

    const daysInThisMonth = daysInMonth(year, month);
    const budgetByCat = Object.fromEntries(
      budgets.map((b) => [b.category_key, b.base_amount + b.event_amount]),
    );
    const entryByCatWeek = {};
    for (const e of entries) {
      (entryByCatWeek[e.category_key] ??= {})[e.week_no] = e.amount;
    }

    const now = today(TZ);
    const isCurrentMonth = year === now.getUTCFullYear() && month === now.getUTCMonth() + 1;
    const todayKey = now.toISOString().slice(0, 10);
    const currentWeekNo = isCurrentMonth
      ? (weeks.find((w) => todayKey >= w.startsOn && todayKey <= w.endsOn)?.week_no ?? null)
      : null;

    const weekMeta = weeks.map((w) => ({
      weekNo: w.week_no,
      startsOn: w.startsOn,
      endsOn: w.endsOn,
      days: (new Date(`${w.endsOn}T00:00:00Z`) - new Date(`${w.startsOn}T00:00:00Z`)) / 86400000 + 1,
    }));

    const daysElapsed = daysElapsedIn(year, month, now);

    // Per-week grand totals across all categories. Summing pro-rata targets
    // is exact, not an approximation: each category's weekly target is
    // (budget × weekDays / monthDays), so the categories' targets sum to
    // (budgetTotal × weekDays / monthDays) — the same figure this function
    // would get by pro-rating the total directly.
    const weekTotals = weekMeta.map((w) => ({ weekNo: w.weekNo, target: 0, amount: 0, entered: 0 }));

    let budgetTotal = 0, monthTotal = 0, monthComplete = true;
    let mtdTotal = 0, mtdTargetTotal = 0, currentWeekTargetTotal = 0;

    const categoryRows = categories.map((c) => {
      const budget = budgetByCat[c.key] ?? 0;
      budgetTotal += budget;
      const mtdTarget = proRataTarget(budget, daysElapsed, daysInThisMonth);
      mtdTargetTotal += mtdTarget;

      let entered = 0;
      const weekCells = weekMeta.map((w, i) => {
        const target = proRataTarget(budget, w.days, daysInThisMonth);
        const amount = entryByCatWeek[c.key]?.[w.weekNo];
        const has = amount !== undefined;
        if (has) entered++;
        weekTotals[i].target += target;
        if (has) { weekTotals[i].amount += amount; weekTotals[i].entered++; }
        return { weekNo: w.weekNo, target, amount: has ? amount : null, entered: has };
      });

      const complete = entered === weekMeta.length;
      const partial = entered > 0 && !complete;
      if (!complete) monthComplete = false;

      const sum = weekCells.reduce((t, w) => t + (w.amount ?? 0), 0);
      monthTotal += sum;

      const currentWeekCell = currentWeekNo ? weekCells.find((w) => w.weekNo === currentWeekNo) : null;
      if (currentWeekCell) currentWeekTargetTotal += currentWeekCell.target;
      const monthToDate = currentWeekNo
        ? weekCells.filter((w) => w.weekNo <= currentWeekNo && w.entered).reduce((t, w) => t + w.amount, 0)
        : sum;
      if (currentWeekNo && monthToDate) mtdTotal += monthToDate;

      return {
        key: c.key, label: c.label, description: c.description,
        budget, weeks: weekCells, mtdTarget,
        month: { amount: entered ? sum : null, complete, partial, variance: complete ? sum - budget : null },
        currentWeek: currentWeekCell,
        monthToDate: entered ? monthToDate : null,
      };
    });

    const pace = currentWeekNo ? monthPace({ year, month, monthToDateSpent: mtdTotal }) : null;

    let comparison = null;
    if (isCurrentMonth || monthComplete) {
      const prev = prevMonth(year, month);
      const prevRow = await sql`select id from spend_period where year = ${prev.year} and month = ${prev.month}`;
      if (prevRow[0]) {
        const prevEntries = await sql`
          select coalesce(sum(amount), 0)::int as total, count(*)::int as n
          from spend_entry where period_id = ${prevRow[0].id}`;
        const prevComplete = prevEntries[0].n === categories.length * 4;
        if (prevComplete && monthComplete) {
          const prevTotal = prevEntries[0].total;
          const deltaPct = prevTotal ? ((monthTotal - prevTotal) / prevTotal) * 100 : null;
          comparison = { year: prev.year, month: prev.month, total: prevTotal, deltaPct };
        }
      }
    }

    const weekTotalsOut = weekTotals.map((w) => ({
      ...w, complete: w.entered === categories.length, partial: w.entered > 0 && w.entered < categories.length,
    }));

    return {
      notOpen: false, year, month, locked: Boolean(period.locked_at),
      categories: categoryRows, weekMeta, weekTotals: weekTotalsOut, currentWeekNo,
      budgetTotal, monthTotal, monthComplete, comparison,
      isCurrentMonth, daysElapsed, daysInMonth: daysInThisMonth,
      mtdTotal, mtdTargetTotal, currentWeekTargetTotal, pace,
    };
  } catch (e) {
    console.error('getMonthView failed:', e.message);
    return emptyView;
  }
}

/**
 * Everything the Sunday entry screen needs for one week of the live
 * current month: the eleven category targets and any already-entered
 * amounts, that week's own review answers, and the OTHER weeks-so-far of
 * this month that have a review answer worth showing as history. Always
 * the current month — entry is phone-only and there is no case for
 * entering a month that isn't open, per "budget events are frozen when
 * the month opens."  Returns null for an invalid `weekNo` or no database.
 */
export async function getEntryData(weekNo) {
  if (!hasDb) return null;
  try {
    const now = today(TZ);
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const period = await ensurePeriod(year, month);
    if (!period) return null;

    const [categories, budgets, weeks, entries, reviews] = await Promise.all([
      sql`select key, label, description, position from spend_category
          where archived_at is null order by position`,
      sql`select category_key, base_amount, event_amount from spend_budget where period_id = ${period.id}`,
      sql`select week_no, starts_on::text as "startsOn", ends_on::text as "endsOn"
          from spend_week where period_id = ${period.id} order by week_no`,
      sql`select week_no, category_key, amount from spend_entry where period_id = ${period.id}`,
      sql`select week_no, win, biggest_unnecessary as "biggestUnnecessary", one_change as "oneChange"
          from sunday_review where period_id = ${period.id}`,
    ]);

    const weekRow = weeks.find((w) => w.week_no === weekNo);
    if (!weekRow) return null;

    const daysInThisMonth = daysInMonth(year, month);
    const weekDays = (new Date(`${weekRow.endsOn}T00:00:00Z`) - new Date(`${weekRow.startsOn}T00:00:00Z`)) / 86400000 + 1;

    const budgetByCat = Object.fromEntries(budgets.map((b) => [b.category_key, b.base_amount + b.event_amount]));
    const entryByCatWeek = {};
    for (const e of entries) (entryByCatWeek[e.category_key] ??= {})[e.week_no] = e.amount;
    const reviewByWeek = Object.fromEntries(reviews.map((r) => [r.week_no, r]));

    let weekTargetTotal = 0;
    const categoryRows = categories.map((c) => {
      const budget = budgetByCat[c.key] ?? 0;
      const target = proRataTarget(budget, weekDays, daysInThisMonth);
      weekTargetTotal += target;
      const cents = entryByCatWeek[c.key]?.[weekNo];
      return {
        key: c.key, label: c.label, description: c.description,
        target, amount: cents !== undefined ? cents / 100 : null,
      };
    });

    const review = reviewByWeek[weekNo] ?? { win: null, biggestUnnecessary: null, oneChange: null };

    const otherWeeksReviews = weeks
      .filter((w) => w.week_no !== weekNo)
      .map((w) => ({ weekNo: w.week_no, startsOn: w.startsOn, endsOn: w.endsOn, ...(reviewByWeek[w.week_no] ?? {}) }))
      .filter((r) => r.win || r.biggestUnnecessary || r.oneChange)
      .sort((a, b) => a.weekNo - b.weekNo);

    return {
      year, month, weekNo, startsOn: weekRow.startsOn, endsOn: weekRow.endsOn,
      monthWeeks: weeks.map((w) => ({ weekNo: w.week_no, startsOn: w.startsOn, endsOn: w.endsOn })),
      categories: categoryRows, weekTargetTotal, review, otherWeeksReviews,
    };
  } catch (e) {
    console.error('getEntryData failed:', e.message);
    return null;
  }
}

/** One Sunday's eleven numbers, one category at a time — see the entry
    screen brief. `amount` is whole dollars; stored as cents. */
export async function setEntry({ year, month, weekNo, categoryKey, amount, enteredBy }) {
  if (!hasDb) return;
  try {
    const period = await ensurePeriod(year, month);
    if (!period) throw new Error('month not open yet');
    await sql`
      insert into spend_entry (period_id, week_no, category_key, amount, entered_by, entered_at)
      values (${period.id}, ${weekNo}, ${categoryKey}, ${Math.round(amount * 100)}, ${enteredBy ?? null}, now())
      on conflict (period_id, week_no, category_key) do update
        set amount = excluded.amount, entered_by = excluded.entered_by, entered_at = now()`;
  } catch (e) {
    console.error('setEntry failed:', e.message);
    throw e;
  }
}

/** The three Sunday Night Review sentences for one week. Nothing is
    required — an absent field stays null, never coalesced to ''. */
export async function setReview({ year, month, weekNo, win, biggestUnnecessary, oneChange }) {
  if (!hasDb) return;
  try {
    const period = await ensurePeriod(year, month);
    if (!period) throw new Error('month not open yet');
    await sql`
      insert into sunday_review (period_id, week_no, win, biggest_unnecessary, one_change, updated_at)
      values (${period.id}, ${weekNo}, ${win ?? null}, ${biggestUnnecessary ?? null}, ${oneChange ?? null}, now())
      on conflict (period_id, week_no) do update
        set win = excluded.win, biggest_unnecessary = excluded.biggest_unnecessary,
            one_change = excluded.one_change, updated_at = now()`;
  } catch (e) {
    console.error('setReview failed:', e.message);
    throw e;
  }
}

/** Suppressed before day 7 per the brief — early-month extrapolation reads
    as a scary number and teaches people to ignore the line. */
export function monthPace({ year, month, monthToDateSpent }) {
  const now = today(TZ);
  const elapsed = daysElapsedIn(year, month, now);
  if (elapsed < 7) return null;
  return paceOf(monthToDateSpent, elapsed, daysInMonth(year, month));
}

/**
 * Change a category's ongoing base budget. Always targets the live current
 * period — "edited rarely" per the brief means changing what the category
 * budgets from here on, not rewriting a locked past month. A future month,
 * once it opens, carries this forward automatically (see ensurePeriod);
 * past months keep whatever they were budgeted at the time.
 */
export async function setBaseBudget({ categoryKey, amount }) {
  if (!hasDb) return;
  const now = today(TZ);
  const year = now.getUTCFullYear(), month = now.getUTCMonth() + 1;
  try {
    const period = await ensurePeriod(year, month);
    await sql`
      insert into spend_budget (period_id, category_key, base_amount)
      values (${period.id}, ${categoryKey}, ${Math.round(amount * 100)})
      on conflict (period_id, category_key) do update set base_amount = excluded.base_amount`;
  } catch (e) {
    console.error('setBaseBudget failed:', e.message);
    throw e;
  }
}

/**
 * Add a budget event — a named, dated reason a category's target moves in
 * one specific month ("Rose birthday · May · Shopping · $120"). Signed:
 * a negative amount is how a quiet month funds a loud one, per "the annual
 * envelope does not move — known events raise specific categories in
 * specific months, funded by lowering quiet months."
 *
 * If that month's period already exists, it was already locked at
 * creation (this app has no separate "open but unlocked" state — see
 * ensurePeriod), so this event is necessarily an amendment: `amended_at`
 * is stamped immediately and the period's stored `event_amount` is
 * updated in place so the change is visible without waiting for anything
 * to re-provision. A genuinely future month just accumulates the event;
 * ensurePeriod folds it into the opening budget the first time that month
 * is read, and it is not an amendment because nothing had opened yet.
 */
export async function addBudgetEvent({ name, year, month, categoryKey, amount, note }) {
  if (!hasDb) throw new Error('no database configured');
  try {
    const cents = Math.round(amount * 100);
    const existingPeriod = await sql`select id from spend_period where year = ${year} and month = ${month}`;
    const isAmendment = Boolean(existingPeriod[0]);
    const amendedAt = isAmendment ? new Date().toISOString() : null;

    await sql`
      insert into budget_event (name, year, month, category_key, amount, note, amended_at)
      values (${name}, ${year}, ${month}, ${categoryKey}, ${cents}, ${note || null}, ${amendedAt})`;

    if (isAmendment) {
      await sql`
        update spend_budget set event_amount = event_amount + ${cents}
        where period_id = ${existingPeriod[0].id} and category_key = ${categoryKey}`;
    }
  } catch (e) {
    console.error('addBudgetEvent failed:', e.message);
    throw e;
  }
}

/**
 * Everything the budget & events screen needs: the current base budget per
 * category (what "edited rarely" is editing), every event booked for the
 * given year, and the annual envelope position. The envelope's base is
 * projected from each category's CURRENT base budget across all 12
 * months — the only figure available for months that don't exist as a
 * period yet — so a past month's own historical base (if it once differed)
 * doesn't feed in. `eventsNet` is the sum of every event booked this year;
 * per the brief, this should read as ~0 when events are genuinely funded
 * by lowering quiet months rather than just added.
 */
export async function getBudgetAndEvents(year) {
  if (!hasDb) return null;
  try {
    const now = today(TZ);
    const curYear = now.getUTCFullYear(), curMonth = now.getUTCMonth() + 1;
    const y = year ?? curYear;

    const currentPeriod = await ensurePeriod(curYear, curMonth);

    const [categories, currentBudgets, events] = await Promise.all([
      sql`select key, label, description, position from spend_category
          where archived_at is null order by position`,
      sql`select category_key, base_amount from spend_budget where period_id = ${currentPeriod.id}`,
      sql`select id, name, year, month, category_key as "categoryKey", amount, note,
                 created_at as "createdAt", amended_at as "amendedAt"
          from budget_event where year = ${y} order by month, created_at`,
    ]);

    const baseByCat = Object.fromEntries(currentBudgets.map((b) => [b.category_key, b.base_amount]));
    const categoryRows = categories.map((c) => ({
      key: c.key, label: c.label, description: c.description, base: baseByCat[c.key] ?? 0,
    }));

    const annualBase = categoryRows.reduce((t, c) => t + c.base * 12, 0);
    const eventsNet = events.reduce((t, e) => t + e.amount, 0);

    return { year: y, categories: categoryRows, events, annualBase, eventsNet };
  } catch (e) {
    console.error('getBudgetAndEvents failed:', e.message);
    return null;
  }
}

/**
 * The dashboard tile: one line answering "does this need me?", a second
 * only once pace means something, and an attention flag. Built from the
 * same `getMonthView` every other surface uses, so the tile can never
 * disagree with the month view itself.
 */
export async function getSpendingTile() {
  const now = today(TZ);
  const view = await getMonthView(now.getUTCFullYear(), now.getUTCMonth() + 1);

  if (!view.currentWeekNo) {
    return { line1: 'No entries yet this month', line2: null, attention: false };
  }

  const weekRow = view.weekTotals.find((w) => w.weekNo === view.currentWeekNo);
  const line1 = `Week ${view.currentWeekNo} · ${formatDollars(weekRow.amount)} of ${formatDollars(weekRow.target)}`;
  const line2 = view.pace != null
    ? `Day ${view.daysElapsed} · tracking to ${formatDollars(view.pace)} of ${formatDollars(view.budgetTotal)}`
    : null;

  // "Over the weekly target, or past 90% of it before Friday" — Friday
  // meaning the real weekday, independent of which day-of-month week this
  // is. Hitting 90% by Wednesday is a sharper warning than hitting it on
  // a week's own last day, which is why this isn't just "> target".
  const weekday = now.getUTCDay(); // 0 Sun .. 6 Sat
  const isBeforeFriday = weekday !== 5 && weekday !== 6;
  const attention = weekRow.amount > weekRow.target
    || (isBeforeFriday && weekRow.amount >= weekRow.target * 0.9);

  return { line1, line2, attention };
}
