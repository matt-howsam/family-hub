/* ==========================================================================
   Family Hub — week letter
   Remembered state, not calculated from a distant anchor.

   The school's A/B cycle carries across term breaks and years with no reset,
   so computing forward from a fixed origin drifts silently. We hold the last
   known letter and the Monday it applied to, and roll forward one flip per
   SCHOOL week elapsed. Any correction becomes the new anchor.

   All dates here are UTC-midnight stand-ins for a calendar date in the
   household's timezone. Build them with `today()` — never `new Date()`
   directly, or a Vercel server in UTC will roll the date over at 10am
   Sydney time.
   ========================================================================== */

import { TERMS, SCHOOL_DATES } from './calendar.js';

const DAY = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);

export const TZ = process.env.TZ_NAME || 'Australia/Sydney';

/** Today's calendar date in `tz`, as a UTC-midnight Date. */
export function today(tz = TZ, now = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const g = (t) => p.find((x) => x.type === t).value;
  return new Date(`${g('year')}-${g('month')}-${g('day')}T00:00:00Z`);
}

/** The current wall-clock hour in `tz` as a decimal (e.g. 15.5 = 3:30pm).
    For time-of-day gates (has school ended, is it after 15:30) — never for
    deciding which calendar date it is; use `today()` for that. */
export function hourNow(tz = TZ, now = new Date()) {
  const p = new Intl.DateTimeFormat('en-AU', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);
  const g = (t) => Number(p.find((x) => x.type === t).value);
  return g('hour') + g('minute') / 60;
}

/** The current wall-clock hour and minute in `tz`, as integers — for window
    checks that need minute precision (hourNow's decimal form loses it at
    the boundary). Shared by the meal planner's night-before prep window and
    the to-do module's evening line — see docs/family-hub-todo-brief.md:
    "Implement it once and share it; do not build a parallel scheduler." */
export function sydneyHM(tz = TZ, now = new Date()) {
  const p = new Intl.DateTimeFormat('en-AU', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);
  const g = (t) => Number(p.find((x) => x.type === t).value);
  return { h: g('hour'), m: g('minute') };
}

/** 17:00–20:30 local — the one "tonight's prep" window shared by the meal
    planner (lib/mealplanner.js#getTonight) and the to-do module's evening
    line. */
export function isEveningWindow(tz = TZ, now = new Date()) {
  const { h, m } = sydneyHM(tz, now);
  return h >= 17 && (h < 20 || (h === 20 && m < 30));
}

/** The Monday of the week containing `d`. */
export function mondayOf(d) {
  const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return new Date(m.getTime() - ((m.getUTCDay() + 6) % 7) * DAY);
}

/**
 * Does the Mon-Fri week beginning `monday` contain any school day?
 *
 * Overlap, not membership. Terms 4 in both 2026 and 2027 begin on a Tuesday
 * because the Monday is a pupil-free day; those are still school weeks.
 * Testing whether the Monday itself falls inside the term would silently drop
 * the week and desynchronise the cycle for the rest of the year.
 */
export function isSchoolWeek(monday, terms = TERMS) {
  const a = iso(monday);
  const b = iso(new Date(monday.getTime() + 4 * DAY));
  return terms.some((t) => a <= t.end && b >= t.start);
}

/** Which term a given DAY sits in. A pupil-free Monday returns null. */
export function termOf(d, terms = TERMS) {
  const s = iso(d);
  return terms.find((t) => s >= t.start && s <= t.end) ?? null;
}

/** Which term the WEEK containing `d` belongs to. Pairs with isSchoolWeek. */
export function termOfWeek(d, terms = TERMS) {
  const mon = mondayOf(d);
  const a = iso(mon);
  const b = iso(new Date(mon.getTime() + 4 * DAY));
  return terms.find((t) => a <= t.end && b >= t.start) ?? null;
}

/**
 * Does a pupil actually attend on this DAY? Weekday, inside a term, and not
 * a whole-school public holiday. Every pupil-free day in SCHOOL_DATES
 * currently falls the day before a term starts, so `termOf` already excludes
 * it; a public holiday can land on a weekday inside a term (ANZAC Day, the
 * King's Birthday), which `termOf` alone would miss.
 */
export function isSchoolDay(d, terms = TERMS, schoolDates = SCHOOL_DATES) {
  const dow = d.getUTCDay(); // 0 Sun, 6 Sat
  if (dow === 0 || dow === 6) return false;
  if (!termOf(d, terms)) return false;
  const s = iso(d);
  return !schoolDates.some((sd) => sd.date === s && sd.kind === 'holiday');
}

/** The next date a pupil attends, strictly after `from`. Looks up to a year
    ahead so it never returns undefined across a long break. */
export function nextSchoolDay(from, terms = TERMS, schoolDates = SCHOOL_DATES) {
  for (let i = 1; i <= 366; i++) {
    const d = new Date(from.getTime() + i * DAY);
    if (isSchoolDay(d, terms, schoolDates)) return d;
  }
  return null;
}

/** Roll the anchor forward. → { letter, schoolWeek, weeksElapsed, resumesOn, term } */
export function weekLetter(anchor, when = today(), terms = TERMS) {
  const from = mondayOf(new Date(anchor.monday + 'T00:00:00Z'));
  const to = mondayOf(when);

  let flips = 0;
  for (let t = from.getTime(); t < to.getTime(); t += 7 * DAY) {
    if (isSchoolWeek(new Date(t + 7 * DAY), terms)) flips++;
  }

  const letter = flips % 2 === 0
    ? anchor.letter
    : (anchor.letter === 'A' ? 'B' : 'A');

  const schoolWeek = isSchoolWeek(to, terms);

  let resumesOn = null;
  if (!schoolWeek) {
    for (let i = 1; i <= 30; i++) {
      const m = new Date(to.getTime() + i * 7 * DAY);
      if (isSchoolWeek(m, terms)) { resumesOn = m; break; }
    }
  }

  return { letter, schoolWeek, weeksElapsed: flips, resumesOn, term: termOfWeek(when, terms) };
}

/** A correction from any device. Becomes the new truth going forward. */
export function correct(letter, when = today(), setBy = 'Matt') {
  return { letter, monday: iso(mondayOf(when)), setBy };
}

/* ==========================================================================
   Spending scorecard month/day maths — see
   docs/family-hub-spending-scorecard-brief.md. Weeks are day-of-month
   ranges (1–7, 8–14, 15–21, 22–end), never ISO weeks or a flat `/4`; a long
   or short Week 4 must never read as a failure or a win. All of it runs in
   Australia/Sydney via `today()`, for the same reason the rest of this file
   does — a UTC server must not roll the date over at 10am local.
   ========================================================================== */

/** Days in `month` (1-12) of `year`, in `tz`. DST-safe: derived from the
    calendar, not a fixed 30/31 table, so it never needs a leap-year special
    case either. */
export function daysInMonth(year, month, tz = TZ) {
  // Day 0 of next month == last day of this month, in UTC-midnight terms.
  const d = new Date(Date.UTC(year, month, 0));
  return d.getUTCDate();
}

/** The four day-of-month week ranges for `year`/`month`: 1–7, 8–14, 15–21,
    22–end. `ends_on` for week 4 is the last day of the month, matching
    `spend_week.ends_on` in the schema. Returns `{ weekNo, startsOn, endsOn }`
    with `startsOn`/`endsOn` as `YYYY-MM-DD` strings, never a timestamptz. */
export function spendWeeksOf(year, month) {
  const last = daysInMonth(year, month);
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = (day) => `${year}-${pad(month)}-${pad(day)}`;
  const bounds = [[1, 7], [8, 14], [15, 21], [22, last]];
  return bounds.map(([start, end], i) => ({
    weekNo: i + 1,
    startsOn: dateStr(start),
    endsOn: dateStr(end),
  }));
}

/** How many days of `year`/`month` have elapsed as of `when` (inclusive of
    today), for pace and month-to-date variance. 0 before the 1st, capped at
    days-in-month once the month has closed. */
export function daysElapsedIn(year, month, when = today()) {
  const last = daysInMonth(year, month);
  const y = when.getUTCFullYear(), m = when.getUTCMonth() + 1;
  if (y < year || (y === year && m < month)) return 0;
  if (y > year || (y === year && m > month)) return last;
  return Math.min(when.getUTCDate(), last);
}

/** A pro-rata target for `periodDays` out of `daysInMonthCount`, against
    `monthlyAmount`. Used for both the weekly target (`periodDays` = that
    week's length) and month-to-date variance (`periodDays` = days elapsed).
    Never `monthlyAmount / 4` — a long Week 4 must read as a bigger target,
    not a bigger overspend. The four weeks' targets for a month always sum
    to exactly `monthlyAmount`, since `periodDays` always sums to
    `daysInMonthCount`. */
export function proRataTarget(monthlyAmount, periodDays, daysInMonthCount) {
  return Math.round((monthlyAmount * periodDays) / daysInMonthCount);
}

/** Projected month total: `spentToDate / daysElapsed × daysInMonth`. Callers
    must suppress this before day 7 — early-month extrapolation is noise, not
    a projection — this function does not gate that itself since some callers
    (e.g. a month-total recompute) need the raw figure regardless of display
    rules. Returns null when `daysElapsed` is 0 to avoid a division by zero. */
export function paceOf(spentToDate, daysElapsed, daysInMonthCount) {
  if (!daysElapsed) return null;
  return Math.round((spentToDate / daysElapsed) * daysInMonthCount);
}
