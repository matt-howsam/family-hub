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

import { TERMS } from './calendar.js';

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
