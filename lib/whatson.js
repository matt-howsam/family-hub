/* ==========================================================================
   Family Hub — What's On
   The one read function behind the What's On listing, the home slot and
   person views. Owns no content: every entry belongs to a source (today,
   only the Home calendar) and is normalised here. See
   docs/family-hub-whats-on-person-views-brief.md.

   Eligibility (PRIVATE_HINTS, TIMETABLE_ECHO) already runs inside
   lib/homecal.js at fetch time. It is re-applied here too, per the brief's
   own invariant that eligibility is a property of this read, not of any one
   adapter — harmless now, load-bearing the day an adapter stops filtering
   itself.
   ========================================================================== */

import { getEvents, calendarFreshness, PRIVATE_HINTS, TIMETABLE_ECHO } from './homecal.js';
import { today, TZ } from './week.js';

const DAY = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);

/* Friendly short label for a timezone that isn't the household's own, for
   the "11:00 (10:00 QLD)" cross-border case. Extend as new zones show up. */
const ZONE_LABEL = { 'Australia/Brisbane': 'QLD' };

function localTimeIn(instant, zone) {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: zone, hour: 'numeric', minute: '2-digit', hour12: false,
  }).format(instant);
}

/* Titles are hand-entered in iCloud, so casing is inconsistent at source:
   "dance", "butter chicken – canteen day", "Caba Boardriders". Full
   title-casing would wreck acronyms this household uses constantly (HSIE,
   KPA, PDHPE). Safe rule: a title with no uppercase at all gets its first
   letter capitalised; anything already carrying a capital is left exactly
   as entered, acronym or not. */
function tidyTitle(title) {
  return /[A-Z]/.test(title) ? title : title.charAt(0).toUpperCase() + title.slice(1);
}

/* homecal.js already expands a multi-day all-day event into one row per day
   it covers (right for a kid's "today", wrong here). Group those rows back
   into a single span, keyed by the raw ical uid before homecal appended a
   date/instant suffix — the same trick the home screen's look-ahead list
   already uses. Timed events need no grouping; they occur once. */
function shapeCalendarEntries(rawEvents) {
  const spans = new Map();
  const singles = [];

  for (const e of rawEvents) {
    if (e.allDay) {
      const base = e.uid.split(':')[0];
      if (!spans.has(base)) spans.set(base, { first: e, dates: [] });
      spans.get(base).dates.push(e.date);
    } else {
      singles.push(e);
    }
  }

  const entries = [];
  for (const { first, dates } of spans.values()) {
    dates.sort();
    entries.push(toEntry(first, dates[0], dates[dates.length - 1]));
  }
  for (const e of singles) {
    entries.push(toEntry(e, e.date, e.date));
  }
  return entries;
}

function toEntry(e, date, endDate) {
  const zone = e.zone || TZ;
  return {
    id: `cal:${e.uid}`,
    layer: 'ours',
    source: 'calendar',
    person: e.person ?? 'household',
    title: tidyTitle(e.label),
    date,
    end_date: endDate,
    all_day: e.allDay,
    starts_at: e.allDay ? null : new Date(e.at).toISOString(),
    time_zone: zone,
    /* Display-only: the Sydney-local time, and — only when the event's own
       zone differs from Sydney at that instant — the origin-zone time and a
       short label, e.g. "11:00 (10:00 QLD)". */
    display_time: e.allDay ? null : e.time,
    display_time_origin: (!e.allDay && zone !== TZ && localTimeIn(new Date(e.at), zone) !== e.time)
      ? `${localTimeIn(new Date(e.at), zone)} ${ZONE_LABEL[zone] || zone}`
      : null,
    location: e.location,
    uniform_override: e.uniformOverride,
    source_ref: 'Home calendar',
  };
}

function eligible(entry) {
  return !PRIVATE_HINTS.test(entry.title) && !TIMETABLE_ECHO.test(entry.title);
}

function byDateThenTime(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.all_day !== b.all_day) return a.all_day ? -1 : 1;
  return (a.starts_at || '').localeCompare(b.starts_at || '');
}

/**
 * Normalised entries for `from` through `from + days`, eligible and sorted.
 * `stale`/`fetchedAt` describe the underlying calendar fetch: on a failed
 * fetch, entries are the last good ones and `stale` is true — never an
 * error, never a silent guess.
 */
export async function getWhatsOn({ from = today(), days = 21 } = {}) {
  const raw = await getEvents({ from, days });
  const { stale, fetchedAt } = calendarFreshness();
  const entries = shapeCalendarEntries(raw).filter(eligible).sort(byDateThenTime);
  return { entries, stale, fetchedAt };
}

/**
 * Group entries for the What's On listing: Today, Tomorrow, This weekend
 * (Mon–Thu only; a single day renders under its own name, not "This
 * weekend"), then Later with one subhead per date.
 *
 * `now` is the real instant, used only for the 06:00–20:30 all-day cutoff —
 * never for which calendar date is "today", which always comes from
 * `calendarToday` (itself from `lib/week.js#today()`).
 */
export function groupForListing(entries, { now = new Date(), calendarToday = today() } = {}) {
  const todayKey = iso(calendarToday);
  const tomorrowKey = iso(new Date(calendarToday.getTime() + DAY));
  const dow = calendarToday.getUTCDay(); // 0 Sun .. 6 Sat

  let weekendDates = [];
  if (dow >= 1 && dow <= 4) { // Mon–Thu: both days are still ahead of tomorrow
    const sat = iso(new Date(calendarToday.getTime() + (6 - dow) * DAY));
    const sun = iso(new Date(calendarToday.getTime() + (7 - dow) * DAY));
    weekendDates = [sat, sun];
  } else if (dow === 5) { // Fri: Saturday is already "Tomorrow"
    weekendDates = [iso(new Date(calendarToday.getTime() + 2 * DAY))];
  }
  // Sat/Sun: the weekend is already Today and Tomorrow.

  const groups = { today: [], tomorrow: [], weekend: new Map(), later: new Map() };

  for (const e of entries) {
    if (e.date === todayKey) {
      if (e.all_day && isAfterCutoffSydney(now)) continue;
      if (!e.all_day && e.starts_at && new Date(e.starts_at) < now) continue;
      groups.today.push(e);
    } else if (e.date === tomorrowKey) {
      groups.tomorrow.push(e);
    } else if (weekendDates.includes(e.date)) {
      if (!groups.weekend.has(e.date)) groups.weekend.set(e.date, []);
      groups.weekend.get(e.date).push(e);
    } else if (e.date > tomorrowKey) {
      if (!groups.later.has(e.date)) groups.later.set(e.date, []);
      groups.later.get(e.date).push(e);
    }
  }

  const byDate = (map) => [...map.entries()].map(([date, items]) => ({ date, items }));

  return {
    today: groups.today,
    tomorrow: groups.tomorrow,
    // Only dates that actually have something — an empty Saturday shouldn't
    // force "This weekend" open, and a lone Sunday reads under its own name.
    weekend: byDate(groups.weekend),
    later: byDate(groups.later),
  };
}

function isAfterCutoffSydney(now) {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === 'hour').value);
  const m = Number(parts.find((p) => p.type === 'minute').value);
  return h > 20 || (h === 20 && m >= 30);
}
