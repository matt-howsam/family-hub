/* ==========================================================================
   Family Hub — holidays
   Every trip and idea the family has, from a long weekend to a month
   overseas. See docs/family-hub-design-brief.md §7.6, revised per Matt,
   22 September 2026: unlimited entries, a `major` flag for the big,
   overseas trips (a guideline of ~2/year, not an enforced limit), and no
   certainty ladder — a row either has a date (planned) or it doesn't (an
   idea, shown in its own quiet list).

   Reads degrade the same way every other module here does: no database
   means an empty view, never a thrown error.
   ========================================================================== */

import { sql, hasDb } from './db.js';
import { today, TZ } from './week.js';
import { PEOPLE } from './people.js';

const DAY = 86400000;

/** A child's age in whole years as of `onDate`, from a stored dob —
    computed forward, never hardcoded, so it's never quietly wrong a year
    from now. */
function ageAt(dob, onDate) {
  const d = new Date(`${dob}T00:00:00Z`);
  let age = onDate.getUTCFullYear() - d.getUTCFullYear();
  const hadBirthday = onDate.getUTCMonth() > d.getUTCMonth()
    || (onDate.getUTCMonth() === d.getUTCMonth() && onDate.getUTCDate() >= d.getUTCDate());
  if (!hadBirthday) age--;
  return age;
}

/** "Rose 17, Tom 15" as of a given date — the line the brief calls out as
    the reason this module deserves to exist. Only meaningful for a
    whole-family entry; callers gate this on `isWholeFamily`. */
function agesLine(onDate) {
  return ['rose', 'tom'].map((id) => `${PEOPLE[id].name} ${ageAt(PEOPLE[id].dob, onDate)}`).join(', ');
}

/** `who` is null for a whole-family entry, or an explicit person list for
    a subset trip (a couple's trip, a kid-and-parent trip). Never infer
    "whole family" from an empty array — an empty array is a data bug, not
    a statement about who's going. */
export function isWholeFamily(who) {
  return who == null;
}

export function centsToDollars(cents) {
  if (cents == null) return null;
  return `$${Math.round(cents / 100).toLocaleString('en-AU')}`;
}

/** The checkout date implied by `nights` — "3 nights" from Good Friday
    means Friday, Saturday, Sunday sleeping and a Monday checkout, i.e.
    starts_on + nights days. Null when either input is missing. */
function endsOn(startsOn, nights) {
  if (!startsOn || nights == null) return null;
  const d = new Date(`${startsOn}T00:00:00Z`);
  return new Date(d.getTime() + nights * DAY).toISOString().slice(0, 10);
}

function shapeHoliday(row) {
  const wholeFamily = isWholeFamily(row.who);
  return {
    id: row.id,
    title: row.title,
    major: row.major,
    startsOn: row.starts_on,
    nights: row.nights,
    endsOn: endsOn(row.starts_on, row.nights),
    who: row.who,
    budget: row.budget,
    note: row.note,
    agesLine: wholeFamily && row.starts_on ? agesLine(new Date(`${row.starts_on}T00:00:00Z`)) : null,
  };
}

const emptyTimeline = { upcoming: [], past: [], ideas: [] };

/**
 * Every trip, split into three lists: upcoming (dated, soonest first),
 * past (dated, most recent first — the household's own travel history),
 * and ideas (no date yet, alphabetical). `major` rides along on each row
 * for the caller to render with more visual weight; it never changes
 * which list something's in.
 */
export async function getTimeline() {
  if (!hasDb) return emptyTimeline;
  try {
    const now = today(TZ);
    const todayKey = now.toISOString().slice(0, 10);

    const rows = await sql`
      select id, title, major, starts_on::text, nights, who, budget, note
      from holiday order by title`;

    const upcoming = rows
      .filter((r) => r.starts_on && r.starts_on >= todayKey)
      .map(shapeHoliday)
      .sort((a, b) => a.startsOn.localeCompare(b.startsOn));

    const past = rows
      .filter((r) => r.starts_on && r.starts_on < todayKey)
      .map(shapeHoliday)
      .sort((a, b) => b.startsOn.localeCompare(a.startsOn));

    const ideas = rows
      .filter((r) => !r.starts_on)
      .map(shapeHoliday)
      .sort((a, b) => a.title.localeCompare(b.title));

    return { upcoming, past, ideas };
  } catch (e) {
    console.error('getTimeline failed:', e.message);
    return emptyTimeline;
  }
}

/** The dashboard tile: one line naming the next thing to look forward to.
    No attention state — that was purely a function of the old slot
    mechanic's decide_by deadline, which doesn't exist anymore. Calm,
    always; per Matt, "means we have more to look forward to." */
export async function getHolidayTile() {
  const { upcoming } = await getTimeline();
  if (upcoming.length === 0) return { line: 'Nothing booked yet', attention: false };

  const now = today(TZ);
  const next = upcoming[0];
  const days = Math.round((new Date(`${next.startsOn}T00:00:00Z`) - now) / DAY);
  const weeks = Math.round(days / 7);
  const when = days <= 13 ? `${days} day${days === 1 ? '' : 's'}` : `${weeks} week${weeks === 1 ? '' : 's'}`;
  return { line: `${next.title} in ${when}`, attention: false };
}

export async function addHoliday({ title, major, startsOn, nights, who, budget, note }) {
  if (!hasDb) return;
  try {
    await sql`
      insert into holiday (title, major, starts_on, nights, who, budget, note)
      values (${title}, ${Boolean(major)}, ${startsOn ?? null}, ${nights ?? null}, ${who ?? null},
              ${budget ?? null}, ${note ?? null})`;
  } catch (e) {
    console.error('addHoliday failed:', e.message);
    throw e;
  }
}

export async function editHoliday({ id, title, major, startsOn, nights, who, budget, note }) {
  if (!hasDb) return;
  try {
    await sql`
      update holiday
      set title = ${title}, major = ${Boolean(major)}, starts_on = ${startsOn ?? null},
          nights = ${nights ?? null}, who = ${who ?? null}, budget = ${budget ?? null}, note = ${note ?? null},
          updated_at = now()
      where id = ${id}`;
  } catch (e) {
    console.error('editHoliday failed:', e.message);
    throw e;
  }
}

/** A real delete, not a soft one — the simplified model has no
    retire-with-reason mechanic. An idea that's a no just goes. */
export async function deleteHoliday(id) {
  if (!hasDb) return;
  try {
    await sql`delete from holiday where id = ${id}`;
  } catch (e) {
    console.error('deleteHoliday failed:', e.message);
    throw e;
  }
}
